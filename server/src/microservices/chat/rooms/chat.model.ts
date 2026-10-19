import mongoose, { Schema } from 'mongoose';

const ReactionSchema = new Schema(
  {
    user_id: { type: String, required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

/**
 * One chat message — in a pod's room OR a club's room, never both.
 *
 * Pod chat came first and every existing row carries only `pod_id`; a club
 * room's rows carry `club_id` instead. Keeping one collection keeps one set of
 * reactions, deletes, moderation and display rules for both rooms.
 */
const PodMessageSchema = new Schema(
  {
    pod_id: {
      type: String,
      index: true,
      required(this: { club_id?: string | null }) {
        return !this.club_id;
      },
    },
    club_id: { type: String, default: null },
    // The id, and only the id — the poster's name and photo are resolved from
    // the account at read time (`userDisplayMap`). They used to be copied here
    // at write time and never updated again.
    user_id: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'STICKER', 'SYSTEM'],
      default: 'TEXT',
    },
    text: { type: String, default: '' },
    image_url: { type: String, default: '' },
    reactions: { type: [ReactionSchema], default: [] },
    deleted: { type: Boolean, default: false },
    // The message this one answers (same room, checked when it is sent). The
    // quote is read from that message at display time, never copied here, so
    // a deleted original reads as deleted in every reply to it.
    reply_to_id: { type: String, default: null },
    // Members named with @, checked against the room when it is sent. They are
    // notified even when they muted the room. Indexed for "where was I mentioned".
    mentions: { type: [String], default: [], index: true },
  },
  { timestamps: true }
);

PodMessageSchema.index({ pod_id: 1, createdAt: -1 });
// A club room's page read, and the retention sweep's age cut-off over club rows.
PodMessageSchema.index(
  { club_id: 1, createdAt: -1 },
  { partialFilterExpression: { club_id: { $type: 'string' } } }
);

export const PodMessageModel = mongoose.model('PodMessage', PodMessageSchema);
