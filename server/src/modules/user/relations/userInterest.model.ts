import { Schema, model, InferSchemaType } from 'mongoose';

const userInterestSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    interest_category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userInterestSchema.index({ user_id: 1, interest_category_id: 1 }, { unique: true });
userInterestSchema.index({ interest_category_id: 1 });

export type UserInterestDoc = InferSchemaType<typeof userInterestSchema> & { _id: any };
export const UserInterestModel = model('UserInterest', userInterestSchema);
