import { Schema, model, Types, type Document } from 'mongoose';

export type MembershipStatus = 'JOINED' | 'BACKOUT_IN_PROCESS' | 'BACKED_OUT';
export type RefundStatus = 'NONE' | 'PENDING' | 'PROCESSED' | 'NOT_ELIGIBLE';
export type JoinSource = 'DIRECT' | 'REFERRAL' | 'PAID' | 'FREE' | 'HOST_ADD';

/**
 * One extra person admitted on someone else's booking.
 *
 * A multi-seat booking used to be a bare integer — the pod knew four people were
 * coming and could not name three of them. The host collects these at the door,
 * because at checkout the buyer usually does not know yet who they are bringing
 * and a required field there would block the payment.
 */
export interface IPodCompanion {
  name: string;
  phone_extension: string | null;
  phone_number: string;
  added_at: Date;
}

export interface IPodMember extends Document {
  pod_id: Types.ObjectId;
  user_id: Types.ObjectId;
  status: MembershipStatus;
  /**
   * Seats this booking holds. One booking can cover several people: the buyer
   * picks a count on Pod Details, pays once and gets ONE ticket that admits
   * that many. `pod_attendees` still carries the buyer's id exactly once (it is
   * an identity list — chat access, permissions, audience), so the extra seats
   * are counted through `Pod.extra_seats` instead of duplicating the id.
   */
  seats: number;
  /** Recorded at check-in; exactly `seats - 1` entries once the host has scanned. */
  companions: IPodCompanion[];
  joined_at: Date;
  backed_out_at: Date | null;
  payment_id: Types.ObjectId | null;
  source: JoinSource;
  referral_token: string | null;
  referred_by: Types.ObjectId | null;
  refund_status: RefundStatus;
  refund_payment_id: Types.ObjectId | null;
  /** Backout attempts used for this pod (each Confirm Backout counts one). */
  backout_count: number;
  /** The IN_PROCESS BackoutRequest while status is BACKOUT_IN_PROCESS. */
  active_backout_id: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const podMemberSchema = new Schema<IPodMember>(
  {
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['JOINED', 'BACKOUT_IN_PROCESS', 'BACKED_OUT'], default: 'JOINED', index: true },
    // Legacy memberships predate multi-seat booking and are all single-seat.
    seats: { type: Number, default: 1, min: 1 },
    companions: {
      type: [
        new Schema<IPodCompanion>(
          {
            name: { type: String, required: true, trim: true },
            phone_extension: { type: String, default: null, trim: true },
            phone_number: { type: String, required: true, trim: true },
            added_at: { type: Date, default: () => new Date() },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    joined_at: { type: Date, default: () => new Date() },
    backed_out_at: { type: Date, default: null },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    source: {
      type: String,
      enum: ['DIRECT', 'REFERRAL', 'PAID', 'FREE', 'HOST_ADD'],
      default: 'DIRECT',
    },
    referral_token: { type: String, default: null, index: true, sparse: true },
    referred_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    refund_status: {
      type: String,
      enum: ['NONE', 'PENDING', 'PROCESSED', 'NOT_ELIGIBLE'],
      default: 'NONE',
    },
    refund_payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    backout_count: { type: Number, default: 0 },
    active_backout_id: { type: Schema.Types.ObjectId, ref: 'BackoutRequest', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

podMemberSchema.index({ pod_id: 1, user_id: 1, status: 1 });
// One booking per payment. The capture path is replayable (webhook retries), and
// booking seats twice for one payment oversells the pod by the whole seat count.
//
// PARTIAL, not sparse. `payment_id` is declared `default: null`, so a free join
// writes the field as null rather than leaving it out — and a sparse index skips
// only MISSING fields, not null ones. Sparse would therefore index every free
// join under the same null key: the second free join in the whole system would
// fail with a duplicate-key error, and on a database that already holds those
// rows the index would simply refuse to build, quietly taking the replay
// protection with it.
podMemberSchema.index(
  { payment_id: 1 },
  { unique: true, partialFilterExpression: { payment_id: { $type: 'objectId' } } }
);

export const PodMemberModel = model<IPodMember>('PodMember', podMemberSchema);
