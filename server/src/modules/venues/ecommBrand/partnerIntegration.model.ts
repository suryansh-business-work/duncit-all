import { Schema, model, type Document, type Types } from 'mongoose';
import {
  razorpayIntegrationSchema,
  shiprocketIntegrationSchema,
  type IBrandRazorpayIntegration,
  type IBrandShiprocketIntegration,
} from './ecommBrand.model';
import type { BrandIntegrationProvider } from './ecommBrand.integrations';

/**
 * A Razorpay or ShipRocket account a brand partner saves ONCE on the Partners
 * console's Integrations page and then picks for any of their brands.
 *
 * It keeps the credential in the brand's own shape (`integrations.<provider>`,
 * only the one for `provider` is filled), so saving, checking and reporting
 * run through the brand helpers in `ecommBrand.integrations.ts` unchanged.
 * Picking it copies the credential onto the brand (`integration_links` records
 * which one); saving or re-checking it here refreshes every brand that uses it.
 */
export interface IPartnerIntegration extends Document<Types.ObjectId> {
  owner_user_id: Types.ObjectId;
  provider: BrandIntegrationProvider;
  /** The partner's own name for the account, e.g. "Main Razorpay". */
  label: string;
  integrations: {
    shiprocket: IBrandShiprocketIntegration;
    razorpay: IBrandRazorpayIntegration;
  };
  created_at: Date;
  updated_at: Date;
}

const partnerIntegrationSchema = new Schema<IPartnerIntegration>(
  {
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['SHIPROCKET', 'RAZORPAY'], required: true },
    label: { type: String, default: '', trim: true },
    integrations: {
      shiprocket: { type: shiprocketIntegrationSchema, default: () => ({}) },
      razorpay: { type: razorpayIntegrationSchema, default: () => ({}) },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

partnerIntegrationSchema.index({ owner_user_id: 1, provider: 1, created_at: -1 });

export const PartnerIntegrationModel = model<IPartnerIntegration>('PartnerIntegration', partnerIntegrationSchema);
