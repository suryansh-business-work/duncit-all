import { Schema, model, type Document, type Types } from 'mongoose';

export type InventoryActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'DUPLICATE'
  | 'DELETE';

export interface IInventoryActivityLog extends Document {
  product_id: Types.ObjectId;
  user_id: string | null;
  user_name: string;
  action: InventoryActivityAction;
  changed_fields: string[];
  notes: string;
  created_at: Date;
}

const schema = new Schema<IInventoryActivityLog>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true, index: true },
    user_id: { type: String, default: null },
    user_name: { type: String, default: '' },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'ARCHIVE', 'RESTORE', 'DUPLICATE', 'DELETE'],
      required: true,
    },
    changed_fields: { type: [String], default: [] },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const InventoryActivityLogModel = model<IInventoryActivityLog>(
  'InventoryActivityLog',
  schema
);
