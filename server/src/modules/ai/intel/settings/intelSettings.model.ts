import { Schema, model, type Types } from 'mongoose';

/**
 * The one Intel settings document (`key: 'default'`). Each section is stored as
 * a sub-document and merged over the seeded defaults on read, so a setting added
 * in a later release ships without a migration.
 */
export interface IIntelSettingsDoc {
  _id: Types.ObjectId;
  key: string;
  sections: Record<string, unknown>;
  revision: number;
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const intelSettingsSchema = new Schema<IIntelSettingsDoc>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    sections: { type: Schema.Types.Mixed, default: {} },
    revision: { type: Number, default: 0 },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);

export const IntelSettingsModel = model<IIntelSettingsDoc>('IntelSettings', intelSettingsSchema, 'intel_settings');
