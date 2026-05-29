import { Schema, model, InferSchemaType } from 'mongoose';

// Follow graph: one row per directed edge (follower_id -> following_id).
// Sharded on follower_id so a user's outgoing edges co-locate.

const userRelationshipSchema = new Schema(
  {
    follower_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    following_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userRelationshipSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });
userRelationshipSchema.index({ following_id: 1, created_at: -1 });
userRelationshipSchema.index({ follower_id: 1, created_at: -1 });

export type UserRelationshipDoc = InferSchemaType<typeof userRelationshipSchema> & { _id: any };
export const UserRelationshipModel = model('UserRelationship', userRelationshipSchema);
