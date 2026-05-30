import { Schema, model, InferSchemaType } from 'mongoose';

export const INTEGRATION_PROVIDER_TYPES = [
  'IMAGEKIT',
  'PEXELS',
  'GOOGLE',
  'TWILIO',
  'AI',
] as const;
export type IntegrationProviderType = (typeof INTEGRATION_PROVIDER_TYPES)[number];

/**
 * A named configuration for a third-party integration (ImageKit, Pexels,
 * Google, Twilio, AI provider). Mirrors `commsProvider` so the Tech portal can
 * hold multiple named accounts per service (e.g. two ImageKit projects) and
 * pick a default. Comms (SMTP / Vobiz email & call) intentionally stays in its
 * own module — this one covers the remaining integrations.
 *
 * `config` is Mixed so each provider type stores only the keys it needs; the
 * service layer validates and masks secrets per type.
 */
const integrationProviderSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: INTEGRATION_PROVIDER_TYPES, required: true, index: true },
    description: { type: String, trim: true, default: '' },
    is_default: { type: Boolean, default: false, index: true },
    is_active: { type: Boolean, default: true, index: true },
    config: { type: Schema.Types.Mixed, default: {} },
    last_used_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

integrationProviderSchema.index({ type: 1, is_default: 1 });

export type IntegrationProviderDoc = InferSchemaType<typeof integrationProviderSchema> & { _id: any };
export const IntegrationProviderModel = model('IntegrationProvider', integrationProviderSchema);
