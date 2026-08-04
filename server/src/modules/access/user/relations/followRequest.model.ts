import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * A pending ask to follow a PRIVATE profile.
 *
 * The follow EDGE (UserRelationship) is the record of "A follows B" and is the
 * only thing follower counts and content visibility read. This collection is
 * the record of "A asked to follow B and B has not answered yet" — it never
 * grants anything on its own. Accepting is what writes the edge.
 *
 * Rows are kept after they are answered rather than deleted, so a rejected
 * requester cannot tell a rejection from an unanswered request, and so repeat
 * asks are auditable. The partial unique index is therefore on PENDING rows
 * only: one open ask per pair, any number of historical ones.
 */
const followRequestSchema = new Schema(
  {
    requester_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    target_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
      required: true,
      default: 'PENDING',
    },
    /** When the target (or, for CANCELLED, the requester) answered it. */
    resolved_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

followRequestSchema.index(
  { requester_id: 1, target_id: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);
followRequestSchema.index({ target_id: 1, status: 1, created_at: -1 });
followRequestSchema.index({ requester_id: 1, status: 1 });

export type FollowRequestDoc = InferSchemaType<typeof followRequestSchema> & { _id: any };
export const FollowRequestModel = model('FollowRequest', followRequestSchema);
