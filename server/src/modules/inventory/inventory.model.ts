import { Schema, model, type Document } from 'mongoose';

export interface IInventoryProduct extends Document {
  product_name: string;
  sku: string;
  description: string;
  image_url: string;
  unit_cost: number;
  inventory_count: number;
  requested_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const inventoryProductSchema = new Schema<IInventoryProduct>(
  {
    product_name: { type: String, required: true, trim: true, maxlength: 120 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 50 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    image_url: { type: String, default: '', trim: true },
    unit_cost: { type: Number, required: true, min: 0, max: 1000000 },
    inventory_count: { type: Number, required: true, min: 0, default: 0 },
    requested_count: { type: Number, required: true, min: 0, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

inventoryProductSchema.index({ product_name: 1 });
inventoryProductSchema.index({ is_active: 1 });

export const InventoryProductModel = model<IInventoryProduct>(
  'InventoryProduct',
  inventoryProductSchema
);