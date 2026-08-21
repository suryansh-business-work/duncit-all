import { Schema, model, Types, type Document } from 'mongoose';

/**
 * Immutable, append-only history of every profile-related change to a user —
 * powers Admin > User Management > User Details > User Change Logs.
 *
 * ONE ROW PER CHANGED FIELD. A single save that moves three fields writes
 * three entries, because the table this feeds is read field-by-field: what
 * changed, from what, to what, by whom, from where. Nothing here is ever
 * updated or deleted, so a value can be overwritten on the user document
 * without its history being overwritten with it.
 */

/** What happened to the account, not to the field. */
export type UserChangeAction = 'CREATE' | 'UPDATE' | 'DELETE';
export const USER_CHANGE_ACTIONS: UserChangeAction[] = ['CREATE', 'UPDATE', 'DELETE'];

/**
 * Who made the change, relative to the account it changed.
 *
 * Derived, never claimed: the actor is the verified account behind the
 * request, so editing your own profile is USER and editing someone else's is
 * ADMIN. SYSTEM covers writes with no signed-in caller — signup, a webhook, a
 * background job.
 */
export type UserChangeActorType = 'USER' | 'ADMIN' | 'SYSTEM';
export const USER_CHANGE_ACTOR_TYPES: UserChangeActorType[] = ['USER', 'ADMIN', 'SYSTEM'];

/** Which surface the change came from (the `x-duncit-surface` header). */
export type UserChangeSource = 'NATIVE' | 'MWEB' | 'ADMIN_PORTAL' | 'PORTAL' | 'SERVER';
export const USER_CHANGE_SOURCES: UserChangeSource[] = [
  'NATIVE',
  'MWEB',
  'ADMIN_PORTAL',
  'PORTAL',
  'SERVER',
];

export interface IUserChangeLog extends Document {
  /** The account the change was made TO. */
  user_id: Types.ObjectId;
  /** Document dot-path of the field, e.g. `profile.first_name`. */
  field: string;
  /** Human label for the same field, e.g. `First Name`. */
  field_label: string;
  old_value: string;
  new_value: string;
  action: UserChangeAction;
  actor_type: UserChangeActorType;
  /** The account that made the change; null for SYSTEM writes. */
  actor_user_id: Types.ObjectId | null;
  /** Denormalized so a row still names its author after that account is gone. */
  actor_name: string;
  source: UserChangeSource;
  created_at: Date;
}

const userChangeLogSchema = new Schema<IUserChangeLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    field: { type: String, required: true, index: true },
    field_label: { type: String, default: '' },
    old_value: { type: String, default: '' },
    new_value: { type: String, default: '' },
    action: { type: String, enum: USER_CHANGE_ACTIONS, required: true, index: true },
    actor_type: { type: String, enum: USER_CHANGE_ACTOR_TYPES, required: true, index: true },
    actor_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actor_name: { type: String, default: '' },
    source: { type: String, enum: USER_CHANGE_SOURCES, required: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// The only read this collection serves is "one user's history, newest first".
userChangeLogSchema.index({ user_id: 1, created_at: -1 });

export const UserChangeLogModel = model<IUserChangeLog>('UserChangeLog', userChangeLogSchema);
