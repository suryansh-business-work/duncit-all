import { Schema, Types, model } from 'mongoose';
import type { RentalUnit } from './rentalLines';
import type { DepositPolicy } from './rentalOutcome';

/** Longest proof note, and most photos on one proof. */
export const RENTAL_PROOF_NOTE_MAX = 1000;
export const RENTAL_PROOF_IMAGES_MAX = 6;
/** A booking keeps at most this many proofs and timeline steps. */
export const RENTAL_PROOFS_MAX = 20;
export const RENTAL_EVENTS_MAX = 100;

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
 * the guest, sent through Razorpay (rentalRefund.service.ts), `venue_amount`
 * to the venue (rent less Duncit's commission, plus any deposit it kept) and
 * the commission itself. `deposit_at_venue` is the cash a venue handed back on
 * bookings closed before 2026-11-22 (`deposit_policy` VENUE_CASH). See
 * rentalOutcome.ts.
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

/** NONE: nothing owed. DUE: Duncit owes the guest `refund_due` (queued on
 * Razorpay, or waiting for review). PAID: Razorpay confirmed the refund
 * processed — or, on bookings before 2026-11-22, someone typed a reference
 * (no gateway record: read as REQUIRES_REVIEW, see rentalRefundState.ts).
 * IN_PAYMENT: returned inside the payment's cancellation refund. */
export type RentalRefundStatus = 'NONE' | 'DUE' | 'PAID' | 'IN_PAYMENT';

/** Who acted on a booking, for its timeline. */
export type RentalActorRole = 'SYSTEM' | 'FINANCE' | 'VENUE' | 'GUEST' | 'RAZORPAY';

/** One step of a booking's life, append-only (rule 40: auditability). */
export interface IRentalEvent {
  type: string;
  at: Date;
  actor_id: Types.ObjectId | null;
  actor_role: RentalActorRole;
  amount: number | null;
  detail: string;
}

/** Optional supporting evidence (a return, a damage, a refund note). Never the proof of a gateway refund: that is Razorpay's record. */
export interface IRentalProof {
  note: string;
  image_urls: string[];
  added_by: Types.ObjectId | null;
  added_by_role: RentalActorRole;
  added_at: Date;
}

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
  /** The deposit the venue hands back in cash at the venue. Duncit repays it in the venue's payout. */
  deposit_at_venue: number;
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
  /** How the deposit was settled when the booking closed. Absent on bookings closed before 2026-11-22 (read as VENUE_CASH). */
  deposit_policy: DepositPolicy | null;
  /** The PaymentGatewayRefund carrying `refund_due` back through Razorpay. */
  gateway_refund_id: Types.ObjectId | null;
  /** That record's status, mirrored so the tables filter and sort without a join. */
  refund_gateway_status: string;
  /** What Razorpay confirmed processed. Never typed by a person. */
  refunded_amount: number;
  /** Why the refund waits for Finance instead of going out (over the captured amount, no Razorpay payment, retries used up). */
  refund_review_reason: string;
  proofs: IRentalProof[];
  events: IRentalEvent[];
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
    deposit_at_venue: { type: Number, default: 0, min: 0 },
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
    deposit_policy: { type: String, enum: ['DUNCIT_REFUND', 'VENUE_CASH', null], default: null },
    gateway_refund_id: { type: Schema.Types.ObjectId, ref: 'PaymentGatewayRefund', default: null },
    refund_gateway_status: { type: String, default: '' },
    refunded_amount: { type: Number, default: 0, min: 0 },
    refund_review_reason: { type: String, default: '', maxlength: 500 },
    proofs: {
      type: [
        new Schema<IRentalProof>(
          {
            note: { type: String, default: '', maxlength: RENTAL_PROOF_NOTE_MAX },
            image_urls: { type: [String], default: [] },
            added_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
            added_by_role: { type: String, required: true },
            added_at: { type: Date, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    events: {
      type: [
        new Schema<IRentalEvent>(
          {
            type: { type: String, required: true },
            at: { type: Date, required: true },
            actor_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
            actor_role: { type: String, required: true },
            amount: { type: Number, default: null },
            detail: { type: String, default: '', maxlength: 500 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
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
// The gateway sync finds a booking by its refund; the refund sweep finds refunds owed and not yet queued.
rentalBookingSchema.index({ gateway_refund_id: 1 });
rentalBookingSchema.index({ refund_status: 1, gateway_refund_id: 1, refund_review_reason: 1 });

/** An event to `$push` onto a booking's timeline, capped at the newest RENTAL_EVENTS_MAX. */
export function rentalEventPush(event: Omit<IRentalEvent, 'at' | 'actor_id' | 'amount'> & {
  actor_id?: string | Types.ObjectId | null;
  amount?: number | null;
}) {
  const actor = event.actor_id ? new Types.ObjectId(String(event.actor_id)) : null;
  return {
    events: {
      $each: [
        {
          type: event.type,
          at: new Date(),
          actor_id: actor,
          actor_role: event.actor_role,
          amount: event.amount ?? null,
          detail: event.detail.slice(0, 500),
        },
      ],
      $slice: -RENTAL_EVENTS_MAX,
    },
  };
}

export const RentalBookingModel = model<IRentalBooking>('RentalBooking', rentalBookingSchema);
