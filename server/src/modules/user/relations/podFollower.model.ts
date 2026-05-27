import { Schema, model, InferSchemaType } from 'mongoose';

const podFollowerSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

podFollowerSchema.index({ user_id: 1, pod_id: 1 }, { unique: true });
podFollowerSchema.index({ pod_id: 1, created_at: -1 });
podFollowerSchema.index({ user_id: 1, created_at: -1 });

export type PodFollowerDoc = InferSchemaType<typeof podFollowerSchema> & { _id: any };
export const PodFollowerModel = model('PodFollower', podFollowerSchema);
