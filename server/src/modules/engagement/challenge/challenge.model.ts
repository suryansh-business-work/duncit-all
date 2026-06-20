import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * Challenge — a named, described activity scoped to the 3-level category
 * hierarchy (Super → Category → Sub, reusing the shared Category model). Managed
 * from the Challenges console (challenge.duncit.com). Super + category are the
 * primary scope; sub-category is optional.
 */
const challengeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type ChallengeDoc = InferSchemaType<typeof challengeSchema> & { _id: Types.ObjectId };
export const ChallengeModel = model('Challenge', challengeSchema);
