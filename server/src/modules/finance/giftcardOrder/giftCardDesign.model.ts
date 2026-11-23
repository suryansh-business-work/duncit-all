import { Schema, model, Types, type Document } from 'mongoose';

/**
 * One gift card design in the Loyalty catalogue — the printed front and back a
 * buyer sees and flips. Members only ever see the DEFAULT design (one unified
 * gift card); the rest are kept for seasonal swaps and are organised by the
 * free-text `category` the Loyalty team uses to group them.
 *
 * `physical_stock` counts blank printed cards of this design in hand. A
 * physical order may not ask for more than is left, and its payment takes the
 * cards out of stock in the same transaction that issues the scratch cards.
 */
export interface IGiftCardDesign extends Document {
  _id: Types.ObjectId;
  name: string;
  category: string;
  front_image_url: string;
  back_image_url: string;
  is_default: boolean;
  is_active: boolean;
  physical_stock: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

const designSchema = new Schema<IGiftCardDesign>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, default: '', trim: true, maxlength: 80, index: true },
    front_image_url: { type: String, required: true, trim: true, maxlength: 2048 },
    back_image_url: { type: String, required: true, trim: true, maxlength: 2048 },
    is_default: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true, index: true },
    physical_stock: { type: Number, default: 0, min: 0 },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
designSchema.index({ created_at: -1 });
// At most one default design — the database decides when two admins race.
designSchema.index(
  { is_default: 1 },
  { unique: true, partialFilterExpression: { is_default: true }, name: 'one_default_gift_card_design' }
);

export const GiftCardDesignModel = model<IGiftCardDesign>('GiftCardDesign', designSchema);
