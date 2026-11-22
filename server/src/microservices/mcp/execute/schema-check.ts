import { formatProblem } from '@utils/field-formats';
import type { JsonSchema, ToolInputSchema } from '../catalog/json-schema';
import { META_PARAMS } from '../mcp.constants';

/**
 * Every argument checked against the tool's own schema, all the way down,
 * before anything runs — the checks a console form makes before its Save
 * button works:
 *
 *   • a required field is present and not blank ("   " is not a name),
 *   • every value has its declared type, enum member, length and range,
 *   • nested inputs carry no field their type does not declare,
 *   • on a tool that writes, a field named for a format (email, phone, IFSC,
 *     UPI, GSTIN, PIN code, website) holds that format.
 *
 * GraphQL would catch the type errors too, but one at a time and in its own
 * words; blank strings and formats it would let through. Every problem is
 * collected, so the model can ask the person for everything that is missing
 * in one go instead of discovering it a field per call.
 */

export type ProblemKind = 'missing' | 'blank' | 'type' | 'enum' | 'unknown' | 'length' | 'range' | 'format';

export interface ArgumentProblem {
  path: string;
  kind: ProblemKind;
  message: string;
}

/** A list this long already tells the model what to ask; more is noise. */
export const MAX_PROBLEMS = 25;

interface Walk {
  writes: boolean;
  problems: ArgumentProblem[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function join(path: string, key: string | number): string {
  if (typeof key === 'number') return `${path}[${key}]`;
  return path ? `${path}.${key}` : key;
}

function add(walk: Walk, path: string, kind: ProblemKind, message: string): void {
  if (walk.problems.length < MAX_PROBLEMS) walk.problems.push({ path, kind, message });
}

function typeMatches(type: string, value: unknown): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isPlainObject(value);
    default:
      return true;
  }
}

const TYPE_WORDS: Record<string, string> = {
  string: 'text',
  integer: 'a whole number',
  number: 'a number',
  boolean: 'true or false',
  array: 'a list',
  object: 'an object',
};

function checkString(walk: Walk, path: string, key: string, schema: JsonSchema, value: string): void {
  if (schema.enum && !schema.enum.includes(value)) {
    add(walk, path, 'enum', `${path} must be one of: ${schema.enum.join(', ')}.`);
    return;
  }
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    add(walk, path, 'length', `${path} must be at least ${schema.minLength} character${schema.minLength === 1 ? '' : 's'}.`);
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    add(walk, path, 'length', `${path} must be at most ${schema.maxLength} characters.`);
  }
  const format = walk.writes ? formatProblem(key, value) : null;
  if (format) add(walk, path, 'format', `${path} ${format}.`);
}

function checkNumber(walk: Walk, path: string, schema: JsonSchema, value: number): void {
  if (schema.minimum !== undefined && value < schema.minimum) add(walk, path, 'range', `${path} must be ${schema.minimum} or more.`);
  if (schema.maximum !== undefined && value > schema.maximum) add(walk, path, 'range', `${path} must be ${schema.maximum} or less.`);
}

function checkValue(walk: Walk, path: string, key: string, schema: JsonSchema, value: unknown): void {
  // A custom scalar (JSON, DateTime…) has no type here: its own parser decides.
  if (!schema.type) return;
  if (!typeMatches(schema.type, value)) {
    // typeMatches accepts any type it does not know, so the word is always there.
    add(walk, path, 'type', `${path} must be ${TYPE_WORDS[schema.type]}.`);
    return;
  }
  if (typeof value === 'string') checkString(walk, path, key, schema, value);
  else if (typeof value === 'number') checkNumber(walk, path, schema, value);
  else if (Array.isArray(value)) checkList(walk, path, key, schema, value);
  else if (isPlainObject(value) && schema.properties) checkObject(walk, path, schema, schema.properties, value);
}

function checkList(walk: Walk, path: string, key: string, schema: JsonSchema, list: unknown[]): void {
  const items = schema.items;
  if (!items) return;
  list.forEach((item, index) => {
    // Whether a list may hold nulls is GraphQL's call ([String] vs [String!]).
    if (item !== null && item !== undefined) checkValue(walk, join(path, index), key, items, item);
  });
}

const isBlank = (value: unknown): boolean => typeof value === 'string' && value.trim() === '';

function checkObject(
  walk: Walk,
  path: string,
  schema: JsonSchema,
  properties: Record<string, JsonSchema>,
  value: Record<string, unknown>
): void {
  const reported = new Set<string>();
  for (const key of schema.required ?? []) {
    if (!path && (META_PARAMS as readonly string[]).includes(key)) continue;
    const fieldPath = join(path, key);
    const field = value[key];
    if (field === undefined || field === null) {
      add(walk, fieldPath, 'missing', `${fieldPath} is required.`);
    } else if (walk.writes && isBlank(field)) {
      add(walk, fieldPath, 'blank', `${fieldPath} is required and cannot be blank.`);
      reported.add(key);
    }
  }
  for (const [key, field] of Object.entries(value)) {
    if (reported.has(key)) continue;
    const fieldPath = join(path, key);
    const fieldSchema = properties[key];
    if (!fieldSchema) {
      if (schema.additionalProperties === false) add(walk, fieldPath, 'unknown', `${fieldPath} is not a field of this input.`);
      continue;
    }
    if (field !== undefined && field !== null) checkValue(walk, fieldPath, key, fieldSchema, field);
  }
}

/**
 * Every problem with the tool's own arguments (meta parameters already
 * removed), at most MAX_PROBLEMS of them. `writes` turns on the checks a form
 * makes before saving — blank required text and named formats — which would
 * only get in the way of a search.
 */
export function checkArguments(schema: ToolInputSchema, args: Record<string, unknown>, writes: boolean): ArgumentProblem[] {
  const walk: Walk = { writes, problems: [] };
  checkObject(walk, '', { ...schema, additionalProperties: true }, schema.properties, args);
  return walk.problems;
}

/** The fields the person has to supply — what the model should go and ask for. */
export const missingFields = (problems: readonly ArgumentProblem[]): string[] =>
  problems.filter((problem) => problem.kind === 'missing' || problem.kind === 'blank').map((problem) => problem.path);
