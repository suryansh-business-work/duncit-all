import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * Challenge — the reusable CHALLENGE TEMPLATE: a named activity that combines
 * universal tools (tool_instances) with scoring and winner rules, optionally
 * scoped to the 3-level category hierarchy (Super → Category → Sub, reusing
 * the shared Category model). Managed from the Challenges console
 * (challenge.duncit.com).
 *
 * Rows created before the tool engine have no tool_instances; they stay valid
 * catalogue entries but cannot be started on a pod until tools are assigned.
 */
const toolInstanceSchema = new Schema(
  {
    instance_id: { type: String, required: true },
    tool_id: { type: Schema.Types.ObjectId, ref: 'ChallengeTool', required: true },
    tool_type: { type: String, required: true },
    tool_version: { type: Number, default: 1 },
    preset_id: { type: Schema.Types.ObjectId, ref: 'ChallengeToolPreset', default: null },
    label: { type: String, required: true, trim: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false, minimize: false }
);

const rankKeySchema = new Schema(
  {
    rank_by: { type: String, required: true },
    direction: { type: String, enum: ['ASC', 'DESC'], default: 'DESC' },
  },
  { _id: false }
);

const challengeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    is_active: { type: Boolean, default: true },
    tool_instances: { type: [toolInstanceSchema], default: [] },
    participant_mode: { type: String, enum: ['INDIVIDUAL', 'TEAM'], default: 'INDIVIDUAL' },
    winner_rules: {
      rank_by: { type: String, default: 'TOTAL' },
      direction: { type: String, enum: ['ASC', 'DESC'], default: 'DESC' },
      tie_breakers: { type: [rankKeySchema], default: [] },
      podium_size: { type: Number, default: 3, min: 1, max: 10 },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type ChallengeDoc = InferSchemaType<typeof challengeSchema> & { _id: Types.ObjectId };
export type ChallengeToolInstance = InferSchemaType<typeof toolInstanceSchema>;
export const ChallengeModel = model('Challenge', challengeSchema);
