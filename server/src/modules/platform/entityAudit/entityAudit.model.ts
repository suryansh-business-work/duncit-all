import { Schema, model, Types, type Document } from 'mongoose';

/**
 * Immutable, append-only history of every tracked change to a DIRECTORY ENTITY
 * — a venue, a host, a club, a club admin or a region.
 *
 * ONE COLLECTION for all five rather than one per entity, because the question
 * being answered is the same one every time ("what changed on this record, by
 * whom, from where") and the table that answers it is the same table. The
 * entity type is a column, so a new entity is a new value in an enum instead of
 * a new collection, a new model, a new resolver and a fourth copy of the same
 * five columns (rule 34).
 *
 * ONE ROW PER CHANGED FIELD, never updated and never deleted: a value can be
 * overwritten on the record without its history being overwritten with it.
 */

/** The directory entities that carry a change log. */
export const ENTITY_AUDIT_TYPES = ['VENUE', 'HOST', 'CLUB', 'CLUB_ADMIN', 'REGION'] as const;
export type EntityAuditType = (typeof ENTITY_AUDIT_TYPES)[number];

/** What happened to the record, not to the field. */
export const ENTITY_CHANGE_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;
export type EntityChangeAction = (typeof ENTITY_CHANGE_ACTIONS)[number];

/**
 * Who made the change, relative to the record it changed.
 *
 * Derived, never claimed: OWNER is the partner the record belongs to editing
 * their own (a venue owner in Partners, a host in the app), ADMIN is anybody
 * else signed in, and SYSTEM covers writes with no caller at all — a cron
 * sweep, a webhook, a boot task.
 */
export const ENTITY_CHANGE_ACTOR_TYPES = ['OWNER', 'ADMIN', 'SYSTEM'] as const;
export type EntityChangeActorType = (typeof ENTITY_CHANGE_ACTOR_TYPES)[number];

/** Which surface the change came from (the `x-duncit-surface` header). */
export const ENTITY_CHANGE_SOURCES = [
  'NATIVE',
  'MWEB',
  'ADMIN_PORTAL',
  'PORTAL',
  'SERVER',
] as const;
export type EntityChangeSource = (typeof ENTITY_CHANGE_SOURCES)[number];

export interface IEntityChangeLog extends Document {
  entity_type: EntityAuditType;
  /** The record the change was made TO. */
  entity_id: Types.ObjectId;
  /** Its name at the time, denormalized so a row still reads after a rename. */
  entity_label: string;
  /** Document dot-path of the field, e.g. `settings.rules.buffer_minutes`. */
  field: string;
  field_label: string;
  old_value: string;
  new_value: string;
  action: EntityChangeAction;
  actor_type: EntityChangeActorType;
  actor_user_id: Types.ObjectId | null;
  /** Denormalized so a row still names its author after that account is gone. */
  actor_name: string;
  source: EntityChangeSource;
  created_at: Date;
}

const entityChangeLogSchema = new Schema<IEntityChangeLog>(
  {
    entity_type: { type: String, enum: ENTITY_AUDIT_TYPES, required: true, index: true },
    entity_id: { type: Schema.Types.ObjectId, required: true, index: true },
    entity_label: { type: String, default: '' },
    field: { type: String, required: true, index: true },
    field_label: { type: String, default: '' },
    old_value: { type: String, default: '' },
    new_value: { type: String, default: '' },
    action: { type: String, enum: ENTITY_CHANGE_ACTIONS, required: true, index: true },
    actor_type: { type: String, enum: ENTITY_CHANGE_ACTOR_TYPES, required: true, index: true },
    actor_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actor_name: { type: String, default: '' },
    source: { type: String, enum: ENTITY_CHANGE_SOURCES, required: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// The read this collection serves: one record's history, newest first.
entityChangeLogSchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });

export const EntityChangeLogModel = model<IEntityChangeLog>(
  'EntityChangeLog',
  entityChangeLogSchema
);
