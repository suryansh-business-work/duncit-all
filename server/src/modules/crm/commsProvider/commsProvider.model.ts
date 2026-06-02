import { Schema, model, InferSchemaType } from 'mongoose';

export const COMMS_PROVIDER_TYPES = ['SMTP', 'TWILIO_CALL'] as const;
export type CommsProviderType = (typeof COMMS_PROVIDER_TYPES)[number];

/**
 * A named configuration for sending email (SMTP) or placing calls (Twilio).
 * The CRM provider picker now lists Tech-portal Environment Variables entries
 * (EMAIL for SMTP, TWILIO for calls); this legacy model is retained only for
 * backward compatibility. `config` is Mixed so each type stores its own keys.
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
