import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * A curated "Service Offered" title scoped to the Super → Category → Sub
 * taxonomy (all three are `Category` docs at their respective levels). Operators
 * add one or many titles at once under a chosen hierarchy in CRM → Data →
 * Services Offered; venue & host forms then load the matching titles
 * dynamically once their super/category/sub-category is picked.
 */
const serviceOfferedSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    // Normalised slug of `title` ("Sound & Lighting" → "sound-lighting"). The
    // duplicate check runs on this so casing/spacing/punctuation variants of the
    // same title collide within a hierarchy slot.
    slug: { type: String, required: true, trim: true, index: true },
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    // Which lead form(s) this title shows up in. Both default to true so legacy
    // rows keep appearing on both Venue and Host lead pickers.
    applies_to_venue: { type: Boolean, default: true, index: true },
    applies_to_host: { type: Boolean, default: true, index: true },
    // Opt-in (unlike venue/host): existing rows were authored before ecomm existed.
    applies_to_ecomm: { type: Boolean, default: false, index: true },
    is_active: { type: Boolean, default: true, index: true },
    sort_order: { type: Number, default: 0 },
    created_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One slug per exact hierarchy slot — prevents duplicate offerings regardless of
// title casing/spacing.
serviceOfferedSchema.index(
  { super_category_id: 1, category_id: 1, sub_category_id: 1, slug: 1 },
  { unique: true }
);

export type ServiceOfferedDoc = InferSchemaType<typeof serviceOfferedSchema> & { _id: any };
export const ServiceOfferedModel = model('CrmServiceOffered', serviceOfferedSchema);
