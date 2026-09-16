import { Schema, model, type Document, type Types } from 'mongoose';

export const LOCATION_SUBSCRIPTION_STATUSES = ['PENDING', 'SENT', 'SKIPPED', 'FAILED'] as const;
export type LocationSubscriptionStatus = (typeof LOCATION_SUBSCRIPTION_STATUSES)[number];

/**
 * A member waiting for a not-yet-launched city.
 *
 * The WhatsApp number is copied off the profile when they subscribe (and
 * refreshed on a repeat tap), so the admin table and the launch send read one
 * collection rather than joining users. The unique (user, city) index is what
 * makes a second tap a no-op.
 */
export interface ILocationSubscription extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  location_id: Types.ObjectId;
  name: string;
  /** Country code + number, digits only — what `destinationFor` returns. */
  whatsapp: string;
  status: LocationSubscriptionStatus;
  /** Why the launch message was skipped or failed; '' otherwise. */
  reason: string;
  notified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const locationSubscriptionSchema = new Schema<ILocationSubscription>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    name: { type: String, default: '', trim: true },
    whatsapp: { type: String, required: true, trim: true },
    status: { type: String, enum: LOCATION_SUBSCRIPTION_STATUSES, default: 'PENDING' },
    reason: { type: String, default: '' },
    notified_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

locationSubscriptionSchema.index({ user_id: 1, location_id: 1 }, { unique: true });
locationSubscriptionSchema.index({ location_id: 1, status: 1 });
locationSubscriptionSchema.index({ created_at: -1 });

export const LocationSubscriptionModel = model<ILocationSubscription>(
  'LocationSubscription',
  locationSubscriptionSchema
);
