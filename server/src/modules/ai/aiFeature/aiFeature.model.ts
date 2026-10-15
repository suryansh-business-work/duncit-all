import { Schema, model, type Types } from 'mongoose';

/**
 * The On/Off switch of one AI feature (one `OPENAI_TASKS` key).
 *
 * Sparse on purpose: a feature with no row is ON. Nothing is seeded, so a
 * deploy changes no behaviour and a task added to the catalogue later starts
 * switched on, like every feature before this console existed.
 *
 * Writes go through `findOneAndUpdate` with a signed-in admin, which the global
 * `tableChangeLog` plugin diffs into `table_change_logs` — that is the audit
 * trail of who switched what, and when. `updated_by_*` is denormalised here too
 * so the console can say "switched off by X" without reading the log.
 */
export interface IAiFeatureSetting {
  _id: Types.ObjectId;
  /** Catalogue key, e.g. `moderation.pod`. */
  key: string;
  enabled: boolean;
  updated_by_id: string;
  updated_by_name: string;
  created_at: Date;
  updated_at: Date;
}

const aiFeatureSettingSchema = new Schema<IAiFeatureSetting>(
  {
    key: { type: String, required: true, unique: true },
    enabled: { type: Boolean, required: true, default: true },
    updated_by_id: { type: String, default: '' },
    updated_by_name: { type: String, default: '' },
  },
  {
    collection: 'ai_feature_settings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const AiFeatureSettingModel = model<IAiFeatureSetting>(
  'AiFeatureSetting',
  aiFeatureSettingSchema,
);
