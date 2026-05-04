import mongoose, { Schema } from 'mongoose';

const ReactionSchema = new Schema(
  {
    user_id: { type: String, required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

const PodMessageSchema = new Schema(
  {
    pod_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    user_name: { type: String, default: '' },
    user_photo: { type: String, default: '' },
    type: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'STICKER', 'SYSTEM'],
      default: 'TEXT',
    },
    text: { type: String, default: '' },
    image_url: { type: String, default: '' },
    reactions: { type: [ReactionSchema], default: [] },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PodMessageSchema.index({ pod_id: 1, createdAt: -1 });

export const PodMessageModel = mongoose.model('PodMessage', PodMessageSchema);
