import mongoose from 'mongoose';
import { INTEL_LIMITS, SENSITIVE_FIELD_PATTERN } from '../../intel.constants';

/**
 * The safety rules for live database access. Pure functions, so every rule is
 * unit-tested: what a read may contain, what a write may do, and what is
 * stripped from anything returned to the model or shown on screen.
 */

/** Operators that run code or write, refused anywhere in a filter or pipeline. */
const FORBIDDEN_KEYS = new Set(['$where', '$function', '$accumulator', '$out', '$merge']);
const READ_STAGES = new Set(['$match', '$group', '$project', '$sort', '$limit', '$skip', '$count', '$unwind', '$addFields', '$set', '$unset', '$sortByCount', '$facet', '$bucket', '$lookup', '$replaceRoot']);
export const WRITE_OPERATIONS = ['insertOne', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'] as const;
export type WriteOperation = (typeof WRITE_OPERATIONS)[number];
const UPDATE_OPERATORS = new Set(['$set', '$unset', '$inc', '$push', '$pull', '$addToSet', '$pop', '$rename', '$min', '$max', '$currentDate', '$mul']);

export class UnsafeQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeQueryError';
  }
}

/** Walks any JSON value and refuses forbidden operators at any depth. */
export function assertNoForbidden(value: unknown, path = ''): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoForbidden(v, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        const where = path ? ' (at ' + path + ')' : '';
        throw new UnsafeQueryError(`${key} is not allowed${where}`);
      }
      assertNoForbidden(inner, path ? `${path}.${key}` : key);
    }
  }
}

/** Extended JSON from the model (`{"$oid": …}`, `{"$date": …}`) into BSON values. */
export function fromExtendedJson<T>(value: unknown): T {
  return mongoose.mongo.BSON.EJSON.deserialize((value ?? {}) as Record<string, unknown>, { relaxed: true }) as T;
}

/** A read-only pipeline over permitted collections, capped in size. */
export function sanitizePipeline(pipeline: unknown, permitted: readonly string[], limit: number): Record<string, unknown>[] {
  if (!Array.isArray(pipeline)) throw new UnsafeQueryError('pipeline must be an array of stages');
  if (pipeline.length > 20) throw new UnsafeQueryError('A pipeline can have at most 20 stages');
  assertNoForbidden(pipeline);
  for (const stage of pipeline) {
    const keys = Object.keys((stage ?? {}) as object);
    const name = keys[0];
    if (keys.length !== 1 || !name || !READ_STAGES.has(name)) throw new UnsafeQueryError(`Stage ${name ?? '(empty)'} is not allowed in a read`);
    if (name === '$lookup') {
      const from = (stage as { $lookup?: { from?: string } }).$lookup?.from;
      if (!from || !permitted.includes(from)) throw new UnsafeQueryError(`$lookup may only read permitted collections`);
    }
  }
  return [...(pipeline as Record<string, unknown>[]), { $limit: Math.min(limit, INTEL_LIMITS.maxQueryRows) }];
}

export function assertWriteShape(operation: string, filter: unknown, payload: unknown): asserts operation is WriteOperation {
  if (!(WRITE_OPERATIONS as readonly string[]).includes(operation)) throw new UnsafeQueryError(`Unknown write operation ${operation}`);
  assertNoForbidden(filter);
  assertNoForbidden(payload);
  if (operation === 'insertOne') {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new UnsafeQueryError('insertOne needs one document');
    if (Object.keys(payload).some((k) => k.startsWith('$'))) throw new UnsafeQueryError('A document cannot contain operators');
    return;
  }
  if (!filter || typeof filter !== 'object' || Object.keys(filter).length === 0) {
    throw new UnsafeQueryError(`${operation} needs a non-empty filter — writes to every document are refused`);
  }
  if (operation.startsWith('update')) {
    const keys = Object.keys((payload ?? {}) as object);
    if (keys.length === 0 || keys.some((k) => !UPDATE_OPERATORS.has(k))) throw new UnsafeQueryError('An update must use operators such as $set or $inc');
  }
}

/** JSON-safe copy with credential-like fields removed at any depth. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 12) return '[nested]';
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && '_bsontype' in value) return (value as { toString: () => string }).toString();
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = SENSITIVE_FIELD_PATTERN.test(key) ? '[redacted]' : redact(inner, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 2000) return `${value.slice(0, 2000)}…`;
  return value;
}

/** Applies a simple update ($set/$unset/$inc) to a copy, for the approval's before/after preview. */
export function previewUpdate(doc: Record<string, unknown>, update: Record<string, unknown>): Record<string, unknown> | null {
  const supported = new Set(['$set', '$unset', '$inc']);
  if (Object.keys(update).some((k) => !supported.has(k))) return null;
  const out = structuredClone(doc);
  const setPath = (path: string, fn: (prev: unknown) => unknown, del = false) => {
    const parts = path.split('.');
    let node = out as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) {
      if (!node[part] || typeof node[part] !== 'object') node[part] = {};
      node = node[part] as Record<string, unknown>;
    }
    const last = parts.at(-1) ?? path;
    if (del) delete node[last];
    else node[last] = fn(node[last]);
  };
  for (const [path, value] of Object.entries((update.$set ?? {}) as object)) setPath(path, () => value);
  for (const path of Object.keys((update.$unset ?? {}) as object)) setPath(path, () => undefined, true);
  for (const [path, by] of Object.entries((update.$inc ?? {}) as object)) setPath(path, (prev) => (Number(prev) || 0) + Number(by));
  return out;
}

export function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'object' && '_bsontype' in value) return String((value as { _bsontype: string })._bsontype);
  return typeof value;
}

/** Field paths and BSON types seen in a sample, for the collection schema document. */
export function describeShape(samples: Record<string, unknown>[], maxFields = 80): Array<{ path: string; types: string[] }> {
  const fields = new Map<string, Set<string>>();
  const visit = (value: unknown, path: string, depth: number) => {
    if (depth > 3 || fields.size >= maxFields) return;
    const type = typeName(value);
    if (path) {
      if (!fields.has(path)) fields.set(path, new Set());
      fields.get(path)?.add(type);
    }
    if (type === 'object') for (const [k, v] of Object.entries(value as object)) visit(v, path ? `${path}.${k}` : k, depth + 1);
  };
  for (const sample of samples) visit(sample, '', 0);
  return [...fields.entries()].map(([path, types]) => ({ path, types: [...types] }));
}
