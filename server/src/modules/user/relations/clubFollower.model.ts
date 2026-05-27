import { Schema, model, InferSchemaType } from 'mongoose';

const clubFollowerSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

clubFollowerSchema.index({ user_id: 1, club_id: 1 }, { unique: true });
clubFollowerSchema.index({ club_id: 1, created_at: -1 });
clubFollowerSchema.index({ user_id: 1, created_at: -1 });

export type ClubFollowerDoc = InferSchemaType<typeof clubFollowerSchema> & { _id: any };
export const ClubFollowerModel = model('ClubFollower', clubFollowerSchema);
