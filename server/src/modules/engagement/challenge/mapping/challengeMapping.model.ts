import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * Challenge settings for one node of the category tree (Super, Category or
 * Sub). Resolution walks Sub → Category → Super and the NEAREST row wins as a
 * whole, so a subcategory row is a full override and a missing row inherits.
 *
 * Both Challenge Portal > Category Mapping and Admin > Categories > Challenge
 * Tools read and write these rows through the same service.
 */
const challengeCategoryMappingSchema = new Schema(
  {
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true, unique: true },
    level: { type: String, enum: ['SUPER', 'CATEGORY', 'SUB'], required: true },
    enabled: { type: Boolean, default: false },
    allowed_tool_ids: { type: [Schema.Types.ObjectId], ref: 'ChallengeTool', default: [] },
    preset_ids: { type: [Schema.Types.ObjectId], ref: 'ChallengeToolPreset', default: [] },
    default_template_id: { type: Schema.Types.ObjectId, ref: 'Challenge', default: null },
    allow_host_customization: { type: Boolean, default: false },
    show_on_pod_details_default: { type: Boolean, default: true },
    allow_audience_voting: { type: Boolean, default: true },
    require_challenge: { type: Boolean, default: false },
    max_competitors: { type: Number, default: 0, min: 0 },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

challengeCategoryMappingSchema.index({ allowed_tool_ids: 1 });

export type ChallengeCategoryMappingDoc = InferSchemaType<typeof challengeCategoryMappingSchema> & {
  _id: Types.ObjectId;
};
export const ChallengeCategoryMappingModel = model('ChallengeCategoryMapping', challengeCategoryMappingSchema);
