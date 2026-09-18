import { Schema, model, type Document } from 'mongoose';

/**
 * One iOS signing identity the server made through the App Store Connect API:
 * an Apple Distribution certificate for a key pair generated here, and the App
 * Store provisioning profile built on it.
 *
 * Kept, never replaced: a build is signed by whichever identity was newest
 * when it ran, so an older build's files stay downloadable after a new
 * identity is generated.
 */
export interface IIosSigning extends Document {
  bundle_id: string;
  team_id: string;
  /** Apple's resource id — how the certificate is revoked. */
  certificate_id: string;
  certificate_serial: string;
  /** The .cer file, DER, base64. */
  certificate_base64: string;
  /** PKCS#1 PEM. Selected only where a .p12 is built. */
  private_key_pem: string;
  profile_id: string;
  profile_uuid: string;
  profile_name: string;
  /** The .mobileprovision file, base64. */
  profile_base64: string;
  /** When the certificate — and so the profile built on it — stops signing. */
  expires_at: Date | null;
  /** Who pressed Generate. */
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const iosSigningSchema = new Schema<IIosSigning>(
  {
    bundle_id: { type: String, required: true, trim: true },
    team_id: { type: String, default: '' },
    certificate_id: { type: String, required: true },
    certificate_serial: { type: String, default: '' },
    certificate_base64: { type: String, required: true },
    private_key_pem: { type: String, required: true, select: false },
    profile_id: { type: String, required: true },
    profile_uuid: { type: String, required: true },
    profile_name: { type: String, default: '' },
    profile_base64: { type: String, required: true },
    expires_at: { type: Date, default: null },
    created_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// "The newest identity" and "the one current when this build ran" are both
// newest-first reads.
iosSigningSchema.index({ created_at: -1 });

export const IosSigningModel = model<IIosSigning>('IosSigning', iosSigningSchema);
