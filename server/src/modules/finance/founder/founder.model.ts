import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * Founder (Startup) Dashboard settings — a tiny key→value store for the
 * founder-entered numbers the KPI formulas need but the database can't derive:
 * balance-sheet constants (cash in bank, fixed expenses), ad spend, targets,
 * alert thresholds, and the manual value for metrics with no live data source
 * yet (e.g. CSAT, NPS, app rating). Everything else is computed from collections.
 */
const founderSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type FounderSettingDoc = InferSchemaType<typeof founderSettingSchema> & {
  _id: Types.ObjectId;
};
export const FounderSettingModel = model('FounderSetting', founderSettingSchema);
