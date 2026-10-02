import { Schema, model, type Document, type Types } from 'mongoose';

export const TRACKING_CONSENT_SURFACES = ['MWEB', 'NATIVE', 'WEBSITE'] as const;
export type TrackingConsentSurface = (typeof TRACKING_CONSENT_SURFACES)[number];

/**
 * One answer a member gave on the tracking-consent banner or their Privacy
 * screen, kept forever and never edited (GDPR Art. 7(1): the controller must
 * be able to DEMONSTRATE consent).
 *
 * Append-only, like PolicyAcceptance: the newest row is the member's current
 * choice, and the rows before it are how it got there. Device-level choices
 * (a signed-out visitor) live only in that device's consent cookie; this
 * collection holds what a signed-in member chose.
 */
export interface ITrackingConsentEvent extends Document {
  user_id: Types.ObjectId;
  analytics: boolean;
  marketing: boolean;
  surface: TrackingConsentSurface;
  created_at: Date;
}

const trackingConsentEventSchema = new Schema<ITrackingConsentEvent>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    analytics: { type: Boolean, required: true },
    marketing: { type: Boolean, required: true },
    surface: { type: String, enum: TRACKING_CONSENT_SURFACES, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// "The member's current choice" is the newest row.
trackingConsentEventSchema.index({ user_id: 1, created_at: -1 });

export const TrackingConsentEventModel = model<ITrackingConsentEvent>(
  'TrackingConsentEvent',
  trackingConsentEventSchema
);
