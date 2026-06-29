import { Schema, model, Types, type Document } from 'mongoose';

export interface ISlotTemplatePerDayPrice {
  weekday: number; // 0..6
  price: number;
}

export interface ISlotTemplateConfig {
  weekdays: number[];
  start_time: string; // 'HH:mm'
  end_time: string;
  default_price: number;
  per_day_price: ISlotTemplatePerDayPrice[];
  skip_weekly_off: boolean;
  skip_holidays: boolean;
}

export type SlotTemplateVisibility = 'PRIVATE' | 'PUBLIC';

export interface ISlotTemplate extends Document {
  owner_user_id: Types.ObjectId;
  venue_id: Types.ObjectId | null;
  name: string;
  description: string;
  category: string;
  visibility: SlotTemplateVisibility;
  is_default: boolean;
  config: ISlotTemplateConfig;
  created_at: Date;
  updated_at: Date;
}

const perDayPriceSchema = new Schema<ISlotTemplatePerDayPrice>(
  {
    weekday: { type: Number, required: true, min: 0, max: 6 },
    price: { type: Number, required: true, min: 0, max: 1_000_000 },
  },
  { _id: false }
);

const configSchema = new Schema<ISlotTemplateConfig>(
  {
    weekdays: { type: [Number], default: [] },
    start_time: { type: String, default: '09:00' },
    end_time: { type: String, default: '10:00' },
    default_price: { type: Number, default: 0, min: 0, max: 1_000_000 },
    per_day_price: { type: [perDayPriceSchema], default: [] },
    skip_weekly_off: { type: Boolean, default: true },
    skip_holidays: { type: Boolean, default: true },
  },
  { _id: false }
);

const slotTemplateSchema = new Schema<ISlotTemplate>(
  {
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    category: { type: String, default: '', trim: true, maxlength: 80 },
    visibility: { type: String, enum: ['PRIVATE', 'PUBLIC'], default: 'PRIVATE' },
    is_default: { type: Boolean, default: false },
    config: { type: configSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const SlotTemplateModel = model<ISlotTemplate>('SlotTemplate', slotTemplateSchema);
