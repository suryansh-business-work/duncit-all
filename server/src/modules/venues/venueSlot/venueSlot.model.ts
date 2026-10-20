import { Schema, model, Types, type Document } from 'mongoose';
import { SLOT_PRICING_MODES, type SlotPricingMode } from './slotCharge';
import { priceSnapshotSchema } from '@modules/venues/venuePricing/venuePricing.schema.model';
import type { VenuePriceBreakdown } from '@modules/venues/venuePricing/venuePricing.types';

/** PENDING = a hold placed by a host's pod that is waiting for the venue
 * owner's approval; it books into BOOKED or releases back to AVAILABLE. */
export type VenueSlotStatus = 'AVAILABLE' | 'PENDING' | 'BOOKED' | 'BLOCKED';

export interface IVenueSlot extends Document {
  venue_id: Types.ObjectId;
  owner_user_id: Types.ObjectId;
  start_at: Date;
  end_at: Date;
  /** True when the owner published this as a whole-day (or whole-date-range)
   * booking rather than a timed window — surfaces label it "Whole day" instead
   * of showing clock times. start_at/end_at still hold the real span. */
  whole_day: boolean;
  /** Rupees — the whole slot (FLAT), per hour (HOURLY) or per person (PER_PAX). See slotCharge.ts. */
  price: number;
  /** How `price` is read. Absent on a slot saved before modes existed = FLAT. */
  pricing_mode?: SlotPricingMode;
  /** Rupees per hour the pod runs past the slot's end. 0 = no overtime charge. */
  overtime_rate?: number;
  /** The venue space/capacity-item this slot is for ('' = whole venue). Slots in
   * different spaces may share the same time window. */
  space_label: string;
  /** Guests this slot can hold — the space's capacity (0 = unset/whole venue). */
  capacity: number;
  status: VenueSlotStatus;
  booked_by_pod_id: Types.ObjectId | null;
  /**
   * Set while an Auto Pod holds this slot — a venue accepted the offer but the
   * pod itself does not exist yet (it is created once a host and a club admin
   * enroll too). The slot stays BOOKED for that whole window, so no ordinary
   * pod can claim it, and `transferAutoPodHold` moves the booking onto the real
   * pod id the moment the Auto Pod materializes.
   */
  booked_by_auto_pod_id: Types.ObjectId | null;
  /**
   * Set while a host↔venue Pod Request holds this slot (slot requested or
   * confirmed, pod not created yet). BOOKED for that window so no ordinary pod
   * can take it; the pod the host then creates adopts the booking.
   */
  booked_by_partner_request_id: Types.ObjectId | null;
  /** Set when the slot was booked through the public developer API. */
  booked_by_api_key_id: Types.ObjectId | null;
  /** Integrator-supplied reference for an external (API) booking. */
  external_ref: string;
  notes: string;
  /**
   * The owner's last decision on a booking request, kept so the decision page
   * can still be opened afterwards. A decline resets `status` to AVAILABLE and
   * clears `booked_by_pod_id`, so without these the fact that the slot was ever
   * requested — and by which pod — is gone the moment it is answered.
   */
  decision: 'NONE' | 'APPROVED' | 'DECLINED';
  decided_at: Date | null;
  /** The pod the decision was about; survives the decline clearing the hold. */
  decided_pod_id: Types.ObjectId | null;
  /** Owner's reason for declining (also mirrored into the pod audit note). */
  decline_reason: string;
  /**
   * Opened for a recurring pod's date on a day the venue had no slot — the
   * host's request IS the slot. It becomes the venue's own slot only once the
   * venue approves it; refused, expired or released before that, it is deleted
   * rather than freed, so the venue never ends up offering a time it never opened.
   */
  requested_by_host: boolean;
  /**
   * The booking's price, frozen when it was confirmed. Set on every instant
   * booking; settlement, refunds and earnings read it, so a later rate change
   * never alters a booking. Null on legacy slots (they settle as before).
   */
  price_snapshot: (VenuePriceBreakdown & { confirmed_at: Date }) | null;
  created_at: Date;
  updated_at: Date;
}

const venueSlotSchema = new Schema<IVenueSlot>(
  {
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    start_at: { type: Date, required: true, index: true },
    end_at: { type: Date, required: true },
    whole_day: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0, max: 1_000_000 },
    pricing_mode: { type: String, enum: SLOT_PRICING_MODES, default: 'FLAT' },
    overtime_rate: { type: Number, default: 0, min: 0, max: 100_000 },
    space_label: { type: String, default: '', trim: true, maxlength: 120 },
    capacity: { type: Number, default: 0, min: 0, max: 100_000 },
    status: {
      type: String,
      enum: ['AVAILABLE', 'PENDING', 'BOOKED', 'BLOCKED'],
      default: 'AVAILABLE',
      index: true,
    },
    booked_by_pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null, index: true },
    booked_by_auto_pod_id: { type: Schema.Types.ObjectId, ref: 'AutoPod', default: null, index: true },
    booked_by_partner_request_id: { type: Schema.Types.ObjectId, ref: 'PodPartnerRequest', default: null, index: true },
    booked_by_api_key_id: { type: Schema.Types.ObjectId, ref: 'ApiKey', default: null, index: true },
    external_ref: { type: String, default: '', trim: true, maxlength: 120 },
    notes: { type: String, default: '', trim: true, maxlength: 280 },
    decision: { type: String, enum: ['NONE', 'APPROVED', 'DECLINED'], default: 'NONE' },
    decided_at: { type: Date, default: null },
    decided_pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null },
    decline_reason: { type: String, default: '', trim: true, maxlength: 280 },
    requested_by_host: { type: Boolean, default: false },
    price_snapshot: { type: priceSnapshotSchema, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

venueSlotSchema.index({ venue_id: 1, start_at: 1 });
venueSlotSchema.index({ venue_id: 1, status: 1, start_at: 1 });

export const VenueSlotModel = model<IVenueSlot>('VenueSlot', venueSlotSchema);
