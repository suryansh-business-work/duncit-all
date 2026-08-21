import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { requestIdentity } from '@observability/requestIdentity';
import { UserModel } from '@modules/access/user/user.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  TRACKED_USER_FIELDS,
  readPath,
  valueText,
  type TrackedUserField,
} from './userAudit.fields';
import {
  UserChangeLogModel,
  type IUserChangeLog,
  type UserChangeAction,
  type UserChangeActorType,
  type UserChangeSource,
} from './userAudit.model';

/**
 * The user change log.
 *
 * Every entry is derived by diffing the user document BEFORE a write against
 * the same document AFTER it. Diffing the stored document rather than the
 * mutation's input is what makes the trail complete: a field the input did not
 * name but the write moved anyway still shows up, and a re-save that changed
 * nothing writes nothing.
 *
 * Writing the log must never be able to fail a profile save, so every call
 * here swallows its own errors — a missing row is a gap in a report, a thrown
 * logger is a user who could not change their name.
 */

/** A path -> rendered value snapshot of the tracked fields of a user doc. */
export type UserSnapshot = Record<string, string>;

export interface UserFieldChange {
  field: string;
  field_label: string;
  old_value: string;
  new_value: string;
}

export function snapshotUser(doc: unknown): UserSnapshot {
  const snap: UserSnapshot = {};
  for (const field of TRACKED_USER_FIELDS) {
    snap[field.path] = valueText(readPath(doc, field.path), field);
  }
  return snap;
}

/** Field-level diff of two snapshots — empty when nothing tracked moved. */
export function diffUserSnapshots(before: UserSnapshot, after: UserSnapshot): UserFieldChange[] {
  const changes: UserFieldChange[] = [];
  for (const field of TRACKED_USER_FIELDS) {
    const oldValue = before[field.path] ?? '';
    const newValue = after[field.path] ?? '';
    if (oldValue !== newValue) {
      changes.push(toChange(field, oldValue, newValue));
    }
  }
  return changes;
}

const toChange = (field: TrackedUserField, oldValue: string, newValue: string): UserFieldChange => ({
  field: field.path,
  field_label: field.label,
  old_value: oldValue,
  new_value: newValue,
});

/**
 * Which surface the change came from.
 *
 * Read from the header the caller declared, never guessed: a value that is not
 * one of the four Duncit clients is SERVER, because that is honestly what an
 * unattributed write is.
 */
export function sourceFromDeclared(declared?: string | null): UserChangeSource {
  switch (declared) {
    case 'NATIVE':
      return 'NATIVE';
    case 'MWEB':
      return 'MWEB';
    case 'ADMIN_PORTAL':
      return 'ADMIN_PORTAL';
    case 'PORTAL':
      return 'PORTAL';
    default:
      return 'SERVER';
  }
}

/** Editing your own account is USER, editing someone else's is ADMIN. */
export function actorTypeFor(actorId: string | null, subjectId: string): UserChangeActorType {
  if (!actorId) return 'SYSTEM';
  return actorId === subjectId ? 'USER' : 'ADMIN';
}

/** The actor's display name, denormalized so the row survives their deletion. */
async function actorName(actorId: string | null): Promise<string> {
  if (!actorId || !Types.ObjectId.isValid(actorId)) return '';
  const actor = await UserModel.findById(actorId)
    .select('profile.first_name profile.last_name auth.email')
    .lean();
  if (!actor) return '';
  const profile = (actor as { profile?: { first_name?: string; last_name?: string } }).profile;
  const name = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
  return name || (actor as { auth?: { email?: string } }).auth?.email || '';
}

const toPub = (doc: IUserChangeLog) => ({
  id: String(doc._id),
  user_id: String(doc.user_id),
  field: doc.field,
  field_label: doc.field_label,
  old_value: doc.old_value ?? '',
  new_value: doc.new_value ?? '',
  action: doc.action,
  actor_type: doc.actor_type,
  actor_user_id: doc.actor_user_id ? String(doc.actor_user_id) : null,
  actor_name: doc.actor_name ?? '',
  source: doc.source,
  created_at: doc.created_at?.toISOString?.() ?? '',
});

/** Allowlists for the shared table engine (DUNCIT TABLE CONTRACT v1). */
const USER_CHANGE_LOG_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['field_label', 'old_value', 'new_value', 'actor_name'],
  sortFields: {
    created_at: 'created_at',
    field_label: 'field_label',
    action: 'action',
    actor_type: 'actor_type',
    actor_name: 'actor_name',
    source: 'source',
  },
  filterFields: {
    field: { type: 'string' },
    field_label: { type: 'string' },
    action: { type: 'enum' },
    actor_type: { type: 'enum' },
    source: { type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export interface RecordUserChangeInput {
  userId: string;
  before: unknown;
  after: unknown;
  action?: UserChangeAction;
}

export const userAuditService = {
  /**
   * Append one entry per field the write actually moved.
   *
   * The actor and the surface come from the request currently in flight, so no
   * call site has to pass them — and none can forget to. A write outside a
   * request (a job, a boot task) is recorded as SYSTEM / SERVER, which is
   * exactly what it is.
   */
  async record(input: RecordUserChangeInput): Promise<void> {
    try {
      const changes = diffUserSnapshots(snapshotUser(input.before), snapshotUser(input.after));
      if (changes.length === 0) return;
      const identity = requestIdentity.current();
      const actorId = identity?.user?.id ?? null;
      const stamp = {
        user_id: new Types.ObjectId(input.userId),
        action: input.action ?? 'UPDATE',
        actor_type: actorTypeFor(actorId, input.userId),
        actor_user_id: actorId && Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : null,
        actor_name: await actorName(actorId),
        source: sourceFromDeclared(identity?.surface),
      };
      await UserChangeLogModel.insertMany(changes.map((change) => ({ ...change, ...stamp })));
    } catch (err) {
      logs.server.error('userAudit', 'record', { error: err, msg: 'record failed', userId: input.userId });
    }
  },

  /** The initial values of a newly created account, diffed against nothing. */
  async recordCreate(userId: string, created: unknown): Promise<void> {
    await userAuditService.record({ userId, before: null, after: created, action: 'CREATE' });
  },

  /** Admin: server-side table page over one user's history. */
  async table(userId: string, input?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(userId)) return { rows: [], total: 0, page: 1, page_size: 0 };
    const { docs, total, page, page_size } = await runTableQuery<IUserChangeLog>(
      UserChangeLogModel,
      { user_id: new Types.ObjectId(userId) },
      input,
      USER_CHANGE_LOG_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },
};
