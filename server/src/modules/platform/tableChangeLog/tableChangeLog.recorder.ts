import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { requestIdentity, type RequestIdentity } from '@observability/requestIdentity';
import { readPath, valueText } from '@utils/doc-diff';
import { auditActorName, sourceFromDeclared } from '@utils/audit-actor';
import { TableChangeLogModel, type TableChangeAction } from './tableChangeLog.model';

/**
 * What the change-log plugin does at write time — loaded on the first write,
 * not at boot, so registering the plugin never compiles a model early.
 */

/**
 * Collections that are themselves logs, sessions or counters. Their writes are
 * bookkeeping, not edits anybody would look for in a table's history — and a
 * log of the change log would never end.
 */
const SKIPPED_COLLECTION = /(?:(?<!cata)logs|counters|sessions|samples|challenges|events)$/i;

/** Fields that move on their own — timestamps and visit marks, not edits. */
const SKIPPED_FIELD = /^(?:updated_at|updatedAt|__v|last_(?:seen|active|login|used|synced|read|checked)\w*)$/;

/** Fields whose value must never be copied into a log anybody can read. */
const SECRET_FIELD = /pass(?:word)?|secret|token|otp|hash|api_?key|private_?key|cvv|pin_code_hash/i;

/** Long values (a description, a JSON blob) are kept readable, not whole. */
const MAX_VALUE = 2000;
const MASK = '••••••';

export interface WriteContext {
  identity: RequestIdentity;
}

/** The person behind this write, or null — only a signed-in person's edits are logged. */
export function writeContext(collection: string): WriteContext | null {
  if (!collection || SKIPPED_COLLECTION.test(collection)) return null;
  const identity = requestIdentity.current();
  if (!identity?.user?.id) return null;
  return { identity };
}

/**
 * The part of a written path a document can be read at: `items.$.qty` and
 * `items.3.qty` stop at `items`, because the array position is not stable
 * between the two reads.
 */
export function readablePath(path: string): string {
  const parts = path.split('.');
  const stop = parts.findIndex((part) => part.includes('$') || /^\d+$/.test(part));
  return (stop === -1 ? parts : parts.slice(0, stop)).join('.');
}

/** The written paths worth a log row, each once. */
export function loggablePaths(paths: readonly string[]): string[] {
  const kept = paths.map(readablePath).filter((path) => path && !SKIPPED_FIELD.test(path.split('.').at(-1) ?? ''));
  // A parent already covers its children (`address` covers `address.city`).
  return [...new Set(kept)].filter((path, _i, all) => !all.some((other) => path.startsWith(`${other}.`)));
}

/** The projection that reads back only what was written. */
export const projectionOf = (paths: readonly string[]): string => [...new Set(paths.map((p) => p.split('.')[0]))].join(' ');

const shown = (value: unknown): string => valueText(value, { ordered: true }).slice(0, MAX_VALUE);

export interface FieldChange {
  field: string;
  old_value: string;
  new_value: string;
}

/** The fields that really moved between two reads; a secret moves without its value. */
export function fieldChanges(paths: readonly string[], before: unknown, after: unknown): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of paths) {
    const oldValue = shown(readPath(before, field));
    const newValue = shown(readPath(after, field));
    if (oldValue === newValue) continue;
    const secret = SECRET_FIELD.test(field);
    changes.push({
      field,
      old_value: secret && oldValue ? MASK : oldValue,
      new_value: secret && newValue ? MASK : newValue,
    });
  }
  return changes;
}

/** Actor names, looked up once per request rather than once per write. */
const names = new WeakMap<RequestIdentity, Promise<string>>();

function actorName(identity: RequestIdentity): Promise<string> {
  let name = names.get(identity);
  if (!name) {
    name = auditActorName(identity.user?.id ?? null);
    names.set(identity, name);
  }
  return name;
}

export interface ChangeRecord {
  collection: string;
  docId: unknown;
  action: TableChangeAction;
  changes: readonly FieldChange[];
  context: WriteContext;
}

async function write(record: ChangeRecord): Promise<void> {
  const { identity } = record.context;
  const user = identity.user;
  const actorId = user?.id && Types.ObjectId.isValid(user.id) ? new Types.ObjectId(user.id) : null;
  const shared = {
    collection_name: record.collection,
    doc_id: String(record.docId),
    action: record.action,
    actor_user_id: actorId,
    actor_name: await actorName(identity),
    actor_email: user?.email ?? '',
    actor_roles: user?.roles ?? [],
    source: sourceFromDeclared(identity.surface),
    ip: identity.ip ?? '',
    user_agent: identity.user_agent ?? '',
  };
  // A create or delete is one row for the record; an update one row per field.
  const rows =
    record.action === 'UPDATE'
      ? record.changes.map((change) => ({ ...shared, ...change }))
      : [{ ...shared, field: '', old_value: '', new_value: '' }];
  if (rows.length > 0) await TableChangeLogModel.insertMany(rows);
}

/** Fire-and-forget: a change log must never fail the edit that caused it. */
export function record(change: ChangeRecord): void {
  if (change.action === 'UPDATE' && change.changes.length === 0) return;
  write(change).catch((error) =>
    logs.server.error('tableChangeLog', 'record', { error, collection: change.collection })
  );
}
