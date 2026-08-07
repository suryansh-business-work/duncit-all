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

/**
 * The three reactions a message can carry.
 *
 * A short, fixed list rather than free emoji: these are the answers that mean
 * something on their own — agreed, disagreed, appreciated — and a reader
 * scanning a thread can take them in without decoding anybody's taste in
 * pictures. Free emoji belong IN the message, which the composer allows.
 */
export const STAFF_REACTIONS = ['THUMBS_UP', 'THUMBS_DOWN', 'HEART'] as const;
export type StaffReactionKind = (typeof STAFF_REACTIONS)[number];

export interface IStaffReaction {
  user_id: string;
  kind: StaffReactionKind;
  at: Date;
}

export interface IStaffMessage extends Document {
  /** The two user ids, sorted and joined — the same for both directions. */
  thread_key: string;
  from_user_id: string;
  to_user_id: string;
  text: string;
  /** An ImageKit URL when a file came with it. Empty for a plain message. */
  attachment_url: string;
  attachment_name: string;
  /** ImageKit's own classification: image, or the mime type for anything else. */
  attachment_type: string;
  /** When the recipient read it. Null until they do. */
  read_at: Date | null;
  /** Set when the author changed the text, so the reader can be told. */
  edited_at: Date | null;
  /**
   * At most one per person — reacting again with the same thing takes it back,
   * and reacting with something else replaces it. A row of counts is a summary
   * of who felt what, not a tally of how many times they clicked.
   */
  reactions: IStaffReaction[];
  /**
   * Deleted messages are kept, not removed.
   *
   * The other person already read it, and a line that vanishes from the middle
   * of a conversation reads as a bug. The text is cleared and the row stays, so
   * the thread still says something was there and is gone.
   */
  deleted_at: Date | null;
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
    // Not required: a file with no caption is a message.
    text: { type: String, default: '', trim: true, maxlength: 4000 },
    attachment_url: { type: String, default: '' },
    attachment_name: { type: String, default: '' },
    attachment_type: { type: String, default: '' },
    read_at: { type: Date, default: null },
    edited_at: { type: Date, default: null },
    reactions: {
      type: [
        new Schema<IStaffReaction>(
          {
            user_id: { type: String, required: true },
            kind: { type: String, enum: STAFF_REACTIONS, required: true },
            at: { type: Date, default: () => new Date() },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    deleted_at: { type: Date, default: null },
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
