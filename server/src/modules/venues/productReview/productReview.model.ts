import { Schema, model, type Document, type Types } from 'mongoose';

/** A customer's review of a product: star rating + comment + images, with
 * thumbs up/down voters and an optional single seller reply. One per (user, product). */
export interface IProductReview extends Document {
  product_id: Types.ObjectId;
  user_id: Types.ObjectId;
  user_name: string;
  rating: number;
  comment: string;
  images: string[];
  up_voter_ids: Types.ObjectId[];
  down_voter_ids: Types.ObjectId[];
  seller_reply: string;
  seller_reply_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const productReviewSchema = new Schema<IProductReview>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user_name: { type: String, default: '', trim: true, maxlength: 120 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true, maxlength: 2000 },
    images: { type: [String], default: [] },
    up_voter_ids: { type: [Schema.Types.ObjectId], default: [] },
    down_voter_ids: { type: [Schema.Types.ObjectId], default: [] },
    seller_reply: { type: String, default: '', trim: true, maxlength: 2000 },
    seller_reply_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One review per user per product — re-submitting updates it.
productReviewSchema.index({ product_id: 1, user_id: 1 }, { unique: true });

export const ProductReviewModel = model<IProductReview>('ProductReview', productReviewSchema);
