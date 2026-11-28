import { Schema, model } from 'mongoose';

/**
 * CRM › CRM Mobile App › Settings — the switches that change how the Duncit
 * CRM app itself behaves, one document for the whole CRM (`key: 'default'`).
 *
 * A missing document, or a field written before it existed, reads as the
 * default, so turning a protection on is never something somebody has to
 * remember to do. Every change made by a signed-in person is written to the
 * table change log by the global plugin; `updated_by` names the last one.
 */
export interface ICrmAppSettings {
  key: string;
  /**
   * Whether a sign-in to the Duncit CRM app goes through the Security
   * Verification screen (location + consent) before it is a session. On by
   * default; the CRM web portal always asks, whatever this says.
   */
  security_verification: boolean;
  updated_by: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const crmAppSettingsSchema = new Schema<ICrmAppSettings>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    security_verification: { type: Boolean, default: true },
    updated_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const CrmAppSettingsModel = model<ICrmAppSettings>('CrmAppSettings', crmAppSettingsSchema);
