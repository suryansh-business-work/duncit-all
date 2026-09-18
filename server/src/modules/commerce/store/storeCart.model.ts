import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A shopper's cart and wishlist, kept on the server so a cart survives a
 * device switch and the ecomm portal can see what was left behind.
 *
 * Both are keyed by `owner_key`: `u:<userId>` for a signed-in shopper, or
 * `g:<token>` for a guest, where the token is a random id the storefront mints
 * once and keeps in the browser. Signing in merges the guest's into the
 * account's (`storeMergeGuest`).
 */
export interface IStoreCartItem {
  product_id: Types.ObjectId;
  variant_id: string;
  qty: number;
  added_at: Date;
}

export type StoreCartStatus = 'ACTIVE' | 'CONVERTED';

export interface IStoreCart extends Document {
  owner_key: string;
  user_id: Types.ObjectId | null;
  items: IStoreCartItem[];
  coupon_code: string;
  /** Contact typed at checkout — lets the portal follow up an abandoned cart. */
  email: string;
  phone: string;
  status: StoreCartStatus;
  last_activity_at: Date;
  reminded_at: Date | null;
  converted_payment_id: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const cartItemSchema = new Schema<IStoreCartItem>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true },
    variant_id: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 },
    added_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const cartSchema = new Schema<IStoreCart>(
  {
    owner_key: { type: String, required: true, unique: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    items: { type: [cartItemSchema], default: [] },
    coupon_code: { type: String, default: '', uppercase: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: '', trim: true, maxlength: 24 },
    status: { type: String, enum: ['ACTIVE', 'CONVERTED'], default: 'ACTIVE', index: true },
    last_activity_at: { type: Date, default: () => new Date(), index: true },
    reminded_at: { type: Date, default: null },
    converted_payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreCartModel = model<IStoreCart>('StoreCart', cartSchema);

export interface IStoreWishlistItem {
  product_id: Types.ObjectId;
  added_at: Date;
}

export interface IStoreWishlist extends Document {
  owner_key: string;
  user_id: Types.ObjectId | null;
  items: IStoreWishlistItem[];
  created_at: Date;
  updated_at: Date;
}

const wishlistItemSchema = new Schema<IStoreWishlistItem>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true },
    added_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const wishlistSchema = new Schema<IStoreWishlist>(
  {
    owner_key: { type: String, required: true, unique: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    items: { type: [wishlistItemSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreWishlistModel = model<IStoreWishlist>('StoreWishlist', wishlistSchema);
