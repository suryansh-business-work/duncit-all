import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * Admin-managed option lists for CRM venue data that are *not* scoped to the
 * Super → Category → Sub taxonomy — currently venue Amenities and Event
 * Suitability. Each `group` is an independent flat list, edited under CRM →
 * Data → Venues. Venue lead forms read the active names via `crmLeadConfig`.
 */
export const MANAGED_OPTION_GROUPS = ['AMENITY', 'EVENT_SUITABILITY'] as const;
export type ManagedOptionGroup = (typeof MANAGED_OPTION_GROUPS)[number];

const managedOptionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    group: { type: String, enum: MANAGED_OPTION_GROUPS, required: true, index: true },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One name per group — prevents duplicate amenities / suitability entries.
managedOptionSchema.index({ group: 1, name: 1 }, { unique: true });

export type ManagedOptionDoc = InferSchemaType<typeof managedOptionSchema> & { _id: Types.ObjectId };
export const ManagedOptionModel = model('CrmManagedOption', managedOptionSchema);
