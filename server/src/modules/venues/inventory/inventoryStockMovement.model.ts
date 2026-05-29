import { Schema, model, type Document, type Types } from 'mongoose';

export type StockMovementType =
  | 'IN'
  | 'OUT'
  | 'RESERVE'
  | 'RELEASE'
  | 'DAMAGE'
  | 'ADJUST';

export interface IInventoryStockMovement extends Document {
  product_id: Types.ObjectId;
  user_id: string | null;
  user_name: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  balance_after: number;
  created_at: Date;
}

const schema = new Schema<IInventoryStockMovement>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true, index: true },
    user_id: { type: String, default: null },
    user_name: { type: String, default: '' },
    type: {
      type: String,
      enum: ['IN', 'OUT', 'RESERVE', 'RELEASE', 'DAMAGE', 'ADJUST'],
      required: true,
    },
    quantity: { type: Number, required: true },
    reason: { type: String, default: '', maxlength: 280 },
    balance_after: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

schema.index({ product_id: 1, created_at: -1 });

export const InventoryStockMovementModel = model<IInventoryStockMovement>(
  'InventoryStockMovement',
  schema
);
