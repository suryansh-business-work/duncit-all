import { Schema, model, type Document } from 'mongoose';

export interface IActiveUserPing extends Document {
  device_id: string;
  user_id: Schema.Types.ObjectId | null;
  date_ymd: string; // YYYY-MM-DD (UTC)
  super_category_slug: string | null;
  created_at: Date;
  updated_at: Date;
}

const schema = new Schema<IActiveUserPing>(
  {
    device_id: { type: String, required: true, index: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    date_ymd: { type: String, required: true, index: true },
    super_category_slug: { type: String, default: null, lowercase: true, trim: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.index({ device_id: 1, date_ymd: 1, super_category_slug: 1 }, { unique: true });

export const ActiveUserPingModel = model<IActiveUserPing>('ActiveUserPing', schema);
