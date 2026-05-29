import { Schema, model, InferSchemaType } from 'mongoose';

export const COMMS_PROVIDER_TYPES = ['SMTP', 'VOBIZ_EMAIL', 'VOBIZ_CALL'] as const;
export type CommsProviderType = (typeof COMMS_PROVIDER_TYPES)[number];

/**
 * A named configuration for sending email or placing calls. Each lead
 * action in CRM can pick which provider to use, so the platform can have
 * multiple SMTP boxes (sales / support / marketing) and multiple Vobiz
 * accounts (e.g. per-city numbers) running side by side.
 *
 * `config` is intentionally untyped (Mixed) so SMTP and Vobiz fields can
 * live in the same model. The service layer validates the keys per type.
 */
const commsProviderSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: COMMS_PROVIDER_TYPES, required: true, index: true },
    description: { type: String, trim: true, default: '' },
    is_default: { type: Boolean, default: false, index: true },
    is_active: { type: Boolean, default: true, index: true },
    config: { type: Schema.Types.Mixed, default: {} },
    last_used_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

commsProviderSchema.index({ type: 1, is_default: 1 });

export type CommsProviderDoc = InferSchemaType<typeof commsProviderSchema> & { _id: any };
export const CommsProviderModel = model('CommsProvider', commsProviderSchema);
