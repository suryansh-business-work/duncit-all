import { Schema, model, Types, type Document } from 'mongoose';

/**
 * Append-only history of every change a PERSON made to a record any portal
 * table lists — one row per changed field, never updated and never deleted.
 *
 * One collection for every table, keyed by the collection the record lives in:
 * the question is always the same ("what changed in this table, by whom, when
 * and from where"), so a new table needs no new model, resolver or screen.
 * The user and directory-entity trails (`userAudit`, `entityAudit`) keep their
 * richer, labelled views; this is the trail every grid gets.
 */

export const TABLE_CHANGE_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;
export type TableChangeAction = (typeof TABLE_CHANGE_ACTIONS)[number];

export interface ITableChangeLog extends Document {
  /** The Mongo collection the record lives in. */
  collection_name: string;
  /** The record's `_id`, as text — not every collection keys on an ObjectId. */
  doc_id: string;
  action: TableChangeAction;
  /** Document dot-path of the field; '' on a CREATE/DELETE row. */
  field: string;
  old_value: string;
  new_value: string;
  actor_user_id: Types.ObjectId | null;
  /** Denormalized so a row still names its author after the account is gone. */
  actor_name: string;
  actor_email: string;
  actor_roles: string[];
  /** The surface the change came from (`x-duncit-surface`), SERVER when undeclared. */
  source: string;
  ip: string;
  user_agent: string;
  created_at: Date;
}

const tableChangeLogSchema = new Schema<ITableChangeLog>(
  {
    collection_name: { type: String, required: true },
    doc_id: { type: String, required: true },
    action: { type: String, enum: TABLE_CHANGE_ACTIONS, required: true },
    field: { type: String, default: '' },
    old_value: { type: String, default: '' },
    new_value: { type: String, default: '' },
    actor_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actor_name: { type: String, default: '' },
    actor_email: { type: String, default: '' },
    actor_roles: { type: [String], default: [] },
    source: { type: String, default: 'SERVER' },
    ip: { type: String, default: '' },
    user_agent: { type: String, default: '' },
  },
  {
    collection: 'table_change_logs',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// A table's trail, newest first; one record's trail within it.
tableChangeLogSchema.index({ collection_name: 1, created_at: -1 });
tableChangeLogSchema.index({ collection_name: 1, doc_id: 1, created_at: -1 });

export const TableChangeLogModel = model<ITableChangeLog>('TableChangeLog', tableChangeLogSchema);
