import { Schema, model, type Types } from 'mongoose';
import type { RentalUnit } from './rentalLines';

/**
 * One rented item on one paid pod booking — written when the payment is
 * captured, inside the same transaction as the seat.
 *
 * BOOKED       the venue's stock for the pod is reserved; the item is out or due out.
 * UNAVAILABLE  it sold out (or was withdrawn) between checkout and capture; the
 *              seat still booked and the line's whole money is owed back.
 * CANCELLED    the pod was cancelled; the money returns with the payment's own
 *              cancellation refund (`refund_status: IN_PAYMENT`).
 * RELEASED     the guest's booking ended (a Backout whose spot was filled).
 * RETURNED     the venue got the item back (or the deposit auto-released).
 * DAMAGED      the venue kept part or all of the deposit as a damage claim.
 *
 * Every outcome but BOOKED is final, and freezes what it owes: `refund_due` to
 * the guest, `venue_amount` to the venue (rent less Duncit's commission, plus
 * any deposit the venue keeps) and the commission itself.
 */
export type RentalBookingStatus = 'BOOKED' | 'UNAVAILABLE' | 'CANCELLED' | 'RELEASED' | 'RETURNED' | 'DAMAGED';
export const RENTAL_BOOKING_STATUSES: readonly RentalBookingStatus[] = [
  'BOOKED',
  'UNAVAILABLE',
  'CANCELLED',
  'RELEASED',
  'RETURNED',
  'DAMAGED',
];

/** NONE: nothing owed. DUE: Finance owes the guest `refund_due`. PAID: Finance
 * paid it. IN_PAYMENT: returned inside the payment's cancellation refund. */
export type RentalRefundStatus = 'NONE' | 'DUE' | 'PAID' | 'IN_PAYMENT';

export interface IRentalBooking {
  _id: Types.ObjectId;
  payment_doc_id: Types.ObjectId;
  /** The payment's own reference (pay_…), for Finance search. */
  payment_ref: string;
  pod_id: Types.ObjectId;
  venue_id: Types.ObjectId;
  user_id: Types.ObjectId;
  item_id: Types.ObjectId;
  name: string;
  image_url: string;
  unit: RentalUnit;
  rate: number;
  units: number;
  quantity: number;
  rent_amount: number;
  deposit_amount: number;
  status: RentalBookingStatus;
  /** What the venue claimed from the deposit for damage. */
  damage_claim: number;
  damage_note: string;
  refund_due: number;
  refund_status: RentalRefundStatus;
  refund_ref: string;
  refunded_at: Date | null;
  refunded_by: Types.ObjectId | null;
  /** Duncit's rental commission percent, frozen when the outcome was recorded. */
  commission_pct: number;
  commission_amount: number;
  venue_amount: number;
  /** The VENUE_RENTAL payout that carried `venue_amount`. Null until settled. */
  release_id: string | null;
  marked_by: Types.ObjectId | null;
  marked_at: Date | null;
  /** True when the deposit sweep closed it, not a person. */
  auto_released: boolean;
  created_at: Date;
  updated_at: Date;
}

const rentalBookingSchema = new Schema<IRentalBooking>(
  {
    payment_doc_id: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    payment_ref: { type: String, required: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    item_id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    image_url: { type: String, default: '' },
    unit: { type: String, enum: ['SLOT', 'HOUR'], default: 'SLOT' },
    rate: { type: Number, required: true, min: 0 },
    units: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1 },
    rent_amount: { type: Number, required: true, min: 0 },
    deposit_amount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: RENTAL_BOOKING_STATUSES, required: true },
    damage_claim: { type: Number, default: 0, min: 0 },
    damage_note: { type: String, default: '', maxlength: 500 },
    refund_due: { type: Number, default: 0, min: 0 },
    refund_status: { type: String, enum: ['NONE', 'DUE', 'PAID', 'IN_PAYMENT'], default: 'NONE' },
    refund_ref: { type: String, default: '', maxlength: 120 },
    refunded_at: { type: Date, default: null },
    refunded_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    commission_pct: { type: Number, default: 0, min: 0, max: 100 },
    commission_amount: { type: Number, default: 0, min: 0 },
    venue_amount: { type: Number, default: 0, min: 0 },
    release_id: { type: String, default: null },
    marked_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    marked_at: { type: Date, default: null },
    auto_released: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One booking per item per payment: a replayed capture can never book an item twice.
rentalBookingSchema.index({ payment_doc_id: 1, item_id: 1 }, { unique: true });
rentalBookingSchema.index({ venue_id: 1, created_at: -1 });
rentalBookingSchema.index({ user_id: 1, created_at: -1 });
// The deposit sweep and the payout both look for open money on a pod.
rentalBookingSchema.index({ status: 1, pod_id: 1 });
rentalBookingSchema.index({ refund_status: 1, created_at: -1 });

export const RentalBookingModel = model<IRentalBooking>('RentalBooking', rentalBookingSchema);
