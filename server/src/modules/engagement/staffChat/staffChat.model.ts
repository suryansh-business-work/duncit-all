import mongoose, { Schema, type Document } from 'mongoose';

/**
 * One-to-one messages between people who work here.
 *
 * Separate from `PodMessage`, which is a room every member of a pod reads, and
 * from `supportChat`, which is a customer talking to whoever is on shift. This
 * is a named person writing to another named person, and neither of those two
 * models has anywhere to put that.
 *
 * There is no threads collection. A conversation between two people is fully
 * described by the pair, so the pair IS the key — which means a thread can
 * never exist without a message in it, and two people can never end up with two
 * threads because they each started one.
 */

export interface IStaffMessage extends Document {
  /** The two user ids, sorted and joined — the same for both directions. */
  thread_key: string;
  from_user_id: string;
  to_user_id: string;
  text: string;
  /** When the recipient read it. Null until they do. */
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Sorted so A→B and B→A land in the same conversation. */
export const threadKey = (a: string, b: string): string => [a, b].sort((x, y) => x.localeCompare(y)).join(':');

const staffMessageSchema = new Schema<IStaffMessage>(
  {
    thread_key: { type: String, required: true, index: true },
    from_user_id: { type: String, required: true, index: true },
    to_user_id: { type: String, required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    read_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Reading one conversation newest-first is the only query that runs on every
// keystroke of a scroll, so it gets the compound index.
staffMessageSchema.index({ thread_key: 1, created_at: -1 });
// "What have I not read" — the badge in every portal's header.
staffMessageSchema.index({ to_user_id: 1, read_at: 1 });

export const StaffMessageModel =
  (mongoose.models.StaffMessage as mongoose.Model<IStaffMessage>) ||
  mongoose.model<IStaffMessage>('StaffMessage', staffMessageSchema);

/**
 * Who counts as a coworker.
 *
 * Exactly the roles that admit someone to a staff console — the union of every
 * portal's `requiredRoles`. Anyone who can sign in to one of these is someone
 * you might need to reach; nobody else appears in the directory at all.
 */
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'CITY_ADMIN',
  'ZONAL_ADMIN',
  'TECH_MANAGER',
  'PRODUCTS_MANAGER',
  'MARKETING_MANAGER',
  'CRM_MANAGER',
  'CHALLENGE_MANAGER',
  'AI_MANAGER',
  'WEBSITE_MANAGER',
  'HR_MANAGER',
  'FINANCE_MANAGER',
  'DEVELOPERS_MANAGER',
  'LEGAL_MANAGER',
  'ONBOARDING_MANAGER',
  'EMPLOYEE',
  'SUPPORT_MANAGER',
  'ADS_MANAGER',
] as const;
