import { Schema, model, type InferSchemaType } from 'mongoose';

/** A city on Discover's "Explore local events" and behind lite.duncit.com/<city>. */
const citySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    country: { type: String, default: 'India' },
    cover_url: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export type LiteCity = InferSchemaType<typeof citySchema>;
export const LiteCityModel = model('LiteCity', citySchema, 'lite_cities');
