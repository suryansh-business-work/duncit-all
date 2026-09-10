import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { requestIdentity } from '@observability/requestIdentity';
import { auditActorName, sourceFromDeclared } from '@utils/audit-actor';
import { diffSnapshots, readPath, snapshotDoc, type FieldChange } from '@utils/doc-diff';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { ENTITY_AUDIT_CONFIG } from './entityAudit.fields';
import {
  EntityChangeLogModel,
  type EntityAuditType,
  type EntityChangeAction,
  type EntityChangeActorType,
  type IEntityChangeLog,
} from './entityAudit.model';

/**
 * The directory entity change log.
 *
 * Every entry is derived by diffing the STORED record before a write against
 * the same record after it. Diffing the document rather than the mutation's
 * input is what makes the trail complete: a field the input did not name but
 * the write moved anyway still shows up, and a re-save that changed nothing
 * writes nothing.
 *
 * Writing the log must never be able to fail the edit that caused it, so every
 * call here swallows its own errors — a missing row is a gap in a report, a
 * thrown logger is an admin who could not save a venue.
 */

export interface RecordEntityChangeInput {
  entityType: EntityAuditType;
  entityId: string;
  /** The stored record before the write; null for a create. */
  before: unknown;
  /** The stored record after the write; null for a delete. */
  after: unknown;
  action?: EntityChangeAction;
}

/** Snapshot one record's tracked fields, per its entity's field list. */
export const snapshotEntity = (entityType: EntityAuditType, doc: unknown) =>
  snapshotDoc(doc, ENTITY_AUDIT_CONFIG[entityType].fields);

/** Field-level diff of two snapshots — empty when nothing tracked moved. */
export const diffEntity = (
  entityType: EntityAuditType,
  before: Record<string, string>,
  after: Record<string, string>
): FieldChange[] => diffSnapshots(before, after, ENTITY_AUDIT_CONFIG[entityType].fields);

/**
 * The record's own partner editing it is OWNER, anybody else signed in is
 * ADMIN, and a write with no caller at all is SYSTEM.
 */
export function entityActorType(
  actorId: string | null,
  ownerId: string | null
): EntityChangeActorType {
  if (!actorId) return 'SYSTEM';
  return ownerId && actorId === ownerId ? 'OWNER' : 'ADMIN';
}

/** The id of the account a record belongs to, when its entity has one. */
function ownerIdOf(entityType: EntityAuditType, doc: unknown): string | null {
  const { ownerPath } = ENTITY_AUDIT_CONFIG[entityType];
  if (!ownerPath) return null;
  const value = readPath(doc, ownerPath);
  return value ? String(value) : null;
}

/** The record's human name, from whichever side of the write has one. */
function labelOf(entityType: EntityAuditType, after: unknown, before: unknown): string {
  const { labelPath } = ENTITY_AUDIT_CONFIG[entityType];
  const value = readPath(after, labelPath) ?? readPath(before, labelPath);
  return value ? String(value) : '';
}

const toPub = (doc: IEntityChangeLog) => ({
  id: String(doc._id),
  entity_type: doc.entity_type,
  entity_id: String(doc.entity_id),
  entity_label: doc.entity_label ?? '',
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
const ENTITY_CHANGE_LOG_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['field_label', 'old_value', 'new_value', 'actor_name', 'entity_label'],
  sortFields: {
    created_at: 'created_at',
    field_label: 'field_label',
    action: 'action',
    actor_type: 'actor_type',
    actor_name: 'actor_name',
    source: 'source',
    entity_label: 'entity_label',
  },
  filterFields: {
    entity_type: { type: 'enum' },
    field: { type: 'string' },
    field_label: { type: 'string' },
    action: { type: 'enum' },
    actor_type: { type: 'enum' },
    source: { type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const emptyPage = { rows: [], total: 0, page: 1, page_size: 0 };

export const entityAuditService = {
  /**
   * Append one entry per field the write actually moved.
   *
   * The actor and the surface come from the request currently in flight, so no
   * call site has to pass them — and none can forget to. A write outside a
   * request (a cron sweep, a boot task) is recorded as SYSTEM / SERVER, which
   * is exactly what it is.
   */
  async record(input: RecordEntityChangeInput): Promise<void> {
    try {
      const { entityType, entityId, before, after } = input;
      if (!Types.ObjectId.isValid(entityId)) return;
      const changes = diffEntity(
        entityType,
        snapshotEntity(entityType, before),
        snapshotEntity(entityType, after)
      );
      if (changes.length === 0) return;
      const identity = requestIdentity.current();
      const actorId = identity?.user?.id ?? null;
      const stamp = {
        entity_type: entityType,
        entity_id: new Types.ObjectId(entityId),
        entity_label: labelOf(entityType, after, before),
        action: input.action ?? 'UPDATE',
        actor_type: entityActorType(actorId, ownerIdOf(entityType, after ?? before)),
        actor_user_id:
          actorId && Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : null,
        actor_name: await auditActorName(actorId),
        source: sourceFromDeclared(identity?.surface),
      };
      await EntityChangeLogModel.insertMany(changes.map((change) => ({ ...change, ...stamp })));
    } catch (err) {
      logs.server.error('entityAudit', 'record', {
        error: err,
        msg: 'record failed',
        entityType: input.entityType,
        entityId: input.entityId,
      });
    }
  },

  /** One record's complete history, newest first (server-side table page). */
  async table(entityType: EntityAuditType, entityId: string, input?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(entityId)) return emptyPage;
    const { docs, total, page, page_size } = await runTableQuery<IEntityChangeLog>(
      EntityChangeLogModel,
      { entity_type: entityType, entity_id: new Types.ObjectId(entityId) },
      input,
      ENTITY_CHANGE_LOG_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /**
   * Every change to every record of one entity — the console-wide feed, so an
   * admin can ask "what moved across all venues today" without opening rows
   * one at a time.
   */
  async tableForType(entityType: EntityAuditType, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IEntityChangeLog>(
      EntityChangeLogModel,
      { entity_type: entityType },
      input,
      ENTITY_CHANGE_LOG_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },
};
