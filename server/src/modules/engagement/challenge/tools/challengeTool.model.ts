import { Schema, model, InferSchemaType, Types } from 'mongoose';
import { CHALLENGE_TOOL_TYPES } from './challengeTool.catalogue';

/**
 * A universal challenge tool as admins see it in Tool Master: one row per
 * engine tool type, seeded from the catalogue and then admin-owned (name,
 * description, default settings, status). `version` is bumped on every
 * settings change; pod challenges snapshot the version they were built with.
 */
const challengeToolSchema = new Schema(
  {
    tool_type: { type: String, enum: CHALLENGE_TOOL_TYPES, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    default_config: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'INACTIVE' },
    version: { type: Number, default: 1 },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);

export type ChallengeToolDoc = InferSchemaType<typeof challengeToolSchema> & { _id: Types.ObjectId };
export const ChallengeToolModel = model('ChallengeTool', challengeToolSchema);

/** A named, reusable configuration of one tool (e.g. "Cricket runs 1/2/4/6"). */
const challengeToolPresetSchema = new Schema(
  {
    tool_id: { type: Schema.Types.ObjectId, ref: 'ChallengeTool', required: true, index: true },
    name: { type: String, required: true, trim: true },
    config: { type: Schema.Types.Mixed, default: {} },
    version: { type: Number, default: 1 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);

export type ChallengeToolPresetDoc = InferSchemaType<typeof challengeToolPresetSchema> & { _id: Types.ObjectId };
export const ChallengeToolPresetModel = model('ChallengeToolPreset', challengeToolPresetSchema);
