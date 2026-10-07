import mongoose, { Schema, type Document, type Types } from 'mongoose';

/** Who started it: a venue asking a host, or a host asking a venue. */
export type PartnerRequestDirection = 'VENUE_TO_HOST' | 'HOST_TO_VENUE';

/**
 * REQUESTED → ACCEPTED (the other side said yes) → SLOT_REQUESTED (the picker
 * chose one of the venue's open slots, now held) → SLOT_CONFIRMED (the other
 * side confirmed it) → POD_CREATED (the host published the pod on that slot).
 * REJECTED / CANCELLED end it before a slot; EXPIRED when a held slot's start
 * passed with no pod. A declined slot goes back to ACCEPTED.
 */
export type PartnerRequestStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'SLOT_REQUESTED'
  | 'SLOT_CONFIRMED'
  | 'POD_CREATED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

/** Statuses during which the pair may not open a second request. */
export const OPEN_PARTNER_STATUSES: readonly PartnerRequestStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'SLOT_REQUESTED',
  'SLOT_CONFIRMED',
];

export interface IPodPartnerRequest extends Document {
  direction: PartnerRequestDirection;
  venue_id: Types.ObjectId;
  venue_owner_user_id: Types.ObjectId;
  host_user_id: Types.ObjectId;
  status: PartnerRequestStatus;
  /** True while the status is one of OPEN_PARTNER_STATUSES — the unique index keys on it. */
  is_open: boolean;
  note: string;
  /** Distance between the two when it was sent, for the receiver's card. */
  distance_km: number | null;
  slot_id: Types.ObjectId | null;
  slot_start_at: Date | null;
  slot_end_at: Date | null;
  responded_at: Date | null;
  slot_requested_at: Date | null;
  slot_confirmed_at: Date | null;
  pod_id: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const podPartnerRequestSchema = new Schema<IPodPartnerRequest>(
  {
    direction: { type: String, enum: ['VENUE_TO_HOST', 'HOST_TO_VENUE'], required: true },
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    venue_owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    host_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['REQUESTED', 'ACCEPTED', 'SLOT_REQUESTED', 'SLOT_CONFIRMED', 'POD_CREATED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
      default: 'REQUESTED',
    },
    is_open: { type: Boolean, default: true },
    note: { type: String, default: '', trim: true },
    distance_km: { type: Number, default: null },
    slot_id: { type: Schema.Types.ObjectId, ref: 'VenueSlot', default: null },
    slot_start_at: { type: Date, default: null },
    slot_end_at: { type: Date, default: null },
    responded_at: { type: Date, default: null },
    slot_requested_at: { type: Date, default: null },
    slot_confirmed_at: { type: Date, default: null },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The host's and the owner's lists.
podPartnerRequestSchema.index({ host_user_id: 1, direction: 1, updated_at: -1 });
podPartnerRequestSchema.index({ venue_owner_user_id: 1, direction: 1, updated_at: -1 });
// One live request per venue↔host pair, whichever side sent it — enforced by
// the index so two concurrent sends cannot both land.
podPartnerRequestSchema.index(
  { venue_id: 1, host_user_id: 1 },
  { unique: true, partialFilterExpression: { is_open: true }, name: 'one_open_per_pair' }
);
// The expiry sweep: held slots whose start has passed.
podPartnerRequestSchema.index({ status: 1, slot_start_at: 1 });

export const PodPartnerRequestModel =
  (mongoose.models.PodPartnerRequest as mongoose.Model<IPodPartnerRequest>) ||
  mongoose.model<IPodPartnerRequest>('PodPartnerRequest', podPartnerRequestSchema);
