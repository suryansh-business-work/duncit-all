import { Schema, model, type Types } from 'mongoose';

/**
 * The server's mirror of a member's Pod Shop cart (mWeb + native).
 *
 * The cart itself lives on the device (localStorage / secure storage) and stays
 * the source of truth for checkout. This mirror exists for one reason: the
 * "your cart is calling" reminder email, which needs to know what is waiting
 * and since when. It holds ids and quantities only — names and prices are read
 * from the catalogue when a mail is built, so nothing a client sends is ever
 * echoed into an email.
 *
 * Separate from the pet store's `StoreCart` (ecomm.duncit.com) on purpose: the
 * two are different products with different carts (rule 65).
 */
export interface IProductCartLine {
  pod_id: Types.ObjectId;
  product_id: Types.ObjectId;
  variant_id: string;
  quantity: number;
}

export interface IProductCart {
  user_id: Types.ObjectId;
  lines: IProductCartLine[];
  /** Order-free fingerprint of `lines`; an unchanged resync keeps the schedule. */
  signature: string;
  /** When the cart last changed — the first reminder counts from here. */
  changed_at: Date;
  /** Reminders sent since that change; reset to 0 whenever the cart changes. */
  mails_sent: number;
  last_mail_at: Date | null;
}

const lineSchema = new Schema<IProductCartLine>(
  {
    pod_id: { type: Schema.Types.ObjectId, required: true },
    product_id: { type: Schema.Types.ObjectId, required: true },
    variant_id: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const productCartSchema = new Schema<IProductCart>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, unique: true },
    lines: { type: [lineSchema], default: [] },
    signature: { type: String, default: '' },
    changed_at: { type: Date, required: true },
    mails_sent: { type: Number, default: 0 },
    last_mail_at: { type: Date, default: null },
  },
  { collection: 'productcarts', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The reminder sweep's two shapes: a first mail (by change time) and a repeat
// (by last mail time), both bounded by how many have gone out.
productCartSchema.index({ mails_sent: 1, changed_at: 1 });
productCartSchema.index({ mails_sent: 1, last_mail_at: 1 });

export const ProductCartModel = model<IProductCart>('ProductCart', productCartSchema);
