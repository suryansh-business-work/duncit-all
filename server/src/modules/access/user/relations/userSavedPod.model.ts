import { Schema, model, InferSchemaType } from 'mongoose';

const userSavedPodSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userSavedPodSchema.index({ user_id: 1, pod_id: 1 }, { unique: true });
userSavedPodSchema.index({ user_id: 1, created_at: -1 });

export type UserSavedPodDoc = InferSchemaType<typeof userSavedPodSchema> & { _id: any };
export const UserSavedPodModel = model('UserSavedPod', userSavedPodSchema);
