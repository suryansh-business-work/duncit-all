import { Schema, model, type Document, Types } from 'mongoose';

export type SliderScope = 'GLOBAL' | 'LOCATION' | 'ZONE';
export type SliderMediaType = 'IMAGE' | 'VIDEO';

export interface ISlider extends Document {
  slider_id: string;
  title: string;
  description?: string;
  media_url: string;
  media_type: SliderMediaType;
  link_url?: string;
  scope: SliderScope;
  super_category_slug?: string | null;
  location_id?: Types.ObjectId | null;
  zone_name?: string | null;
  sort_order: number;
  starts_at?: Date | null;
  ends_at?: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const sliderSchema = new Schema<ISlider>(
  {
    slider_id: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    media_url: { type: String, required: true },
    media_type: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' },
    link_url: { type: String, default: '' },
    scope: { type: String, enum: ['GLOBAL', 'LOCATION', 'ZONE'], required: true, default: 'GLOBAL' },
    super_category_slug: { type: String, default: null, lowercase: true, trim: true, index: true },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    zone_name: { type: String, default: null, trim: true },
    sort_order: { type: Number, default: 0 },
    starts_at: { type: Date, default: null },
    ends_at: { type: Date, default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

sliderSchema.index({ scope: 1, location_id: 1, zone_name: 1, sort_order: 1 });

export const SliderModel = model<ISlider>('Slider', sliderSchema);
