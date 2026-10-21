import mongoose, { Schema } from 'mongoose';

/**
 * One line of a venue booking's chat: the pod's hosts and the venue's owner,
 * nobody else. Kept out of PodMessage on purpose — a pod's group chat reads by
 * `pod_id`, and a thread about deposits and set-up times must never surface
 * in front of the pod's guests.
 */
const VenueChatMessageSchema = new Schema(
  {
    pod_id: { type: String, required: true },
    venue_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true },
    /** Which side wrote it, fixed at send time: the venue's owner or a pod host. */
    side: { type: String, enum: ['HOST', 'VENUE'], required: true },
    type: { type: String, enum: ['TEXT', 'IMAGE'], default: 'TEXT' },
    text: { type: String, default: '' },
    image_url: { type: String, default: '' },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

VenueChatMessageSchema.index({ pod_id: 1, createdAt: -1 });

export const VenueChatMessageModel = mongoose.model('VenueChatMessage', VenueChatMessageSchema);
