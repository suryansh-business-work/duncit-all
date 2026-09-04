import { Schema, model, Types, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

/**
 * A partner asking Duncit to take them off ONE pod and put somebody else on it.
 *
 * The three roles a pod carries — the venue it is booked at, the host who runs
 * it, and the club admin whose club it belongs to — each get their own Request
 * Change action, and each files a row here. Filing costs Account Health points
 * (Admin > Pods > Pod Settings > Request Change Setting), which is why a
 * duplicate must be impossible rather than merely discouraged: a second tap
 * would be a second deduction for the same ask.
 *
 * It is deliberately NOT an `ApprovalRequest` (server/src/modules/approval):
 * that record is admin-reviewed and carries a payload to approve. This one is
 * answered by ANOTHER PARTNER — the admin only picks who is asked — and it
 * carries a slot booking, a health deduction and a live offer, none of which
 * fit there.
 *
 * OPEN      — filed, waiting for an admin to act
 * OFFERED   — an admin offered the place to a candidate; waiting on THEM
 * RESOLVED  — a replacement took it, or the pod was cancelled and refunded
 * WITHDRAWN — the requester pulled it back before anyone was offered
 *
 * `is_open` mirrors OPEN|OFFERED as a boolean purely so a unique partial index
 * can express "one live request per pod per role" — the only race-safe way to
 * say that in Mongo, and the same trick the coin ledger uses.
 */
export type PodChangeRole = 'VENUE' | 'HOST' | 'CLUB_ADMIN';
export const POD_CHANGE_ROLES: PodChangeRole[] = ['VENUE', 'HOST', 'CLUB_ADMIN'];

export type PodChangeStatus = 'OPEN' | 'OFFERED' | 'RESOLVED' | 'WITHDRAWN';
export const POD_CHANGE_STATUSES: PodChangeStatus[] = [
  'OPEN',
  'OFFERED',
  'RESOLVED',
  'WITHDRAWN',
];

/** How a resolved request ended. NONE while it is still live. */
export type PodChangeResolution = 'NONE' | 'REPLACED' | 'POD_CANCELLED';
export const POD_CHANGE_RESOLUTIONS: PodChangeResolution[] = [
  'NONE',
  'REPLACED',
  'POD_CANCELLED',
];

/** Where a live offer stands with the partner it was sent to. */
export type PodChangeOfferStatus = 'PENDING' | 'APPROVED' | 'PASSED';

/**
 * The place, offered to one candidate.
 *
 * Only the newest offer is live; every previous one is kept in `offer_history`
 * so an admin can see who has already passed rather than offering the same
 * person twice. A VENUE offer carries the slot the new venue committed, because
 * the pod's date and time move with it.
 */
export interface IPodChangeOffer {
  user_id: Types.ObjectId;
  /** VENUE offers only — the venue and the slot it is being asked to give. */
  venue_id: Types.ObjectId | null;
  venue_slot_id: Types.ObjectId | null;
  /** CLUB_ADMIN offers only — the club the candidate would take over. */
  club_id: Types.ObjectId | null;
  /** Snapshotted so a card never re-reads a name that could since have moved. */
  display_name: string;
  status: PodChangeOfferStatus;
  offered_by: Types.ObjectId | null;
  offered_at: Date;
  responded_at: Date | null;
  /** What the candidate said when passing — shown to the admin, never public. */
  pass_reason: string;
}

/** One line of the request's timeline. Appended, never edited. */
export interface IPodChangeEvent {
  action: string;
  actor_user_id: Types.ObjectId | null;
  actor_name: string;
  note: string;
  at: Date;
}

export interface IPodChangeRequest extends Document {
  /** Permanent human id, DUN-CRQ-000001. Minted on the first save. */
  change_request_no: string;
  pod_id: Types.ObjectId;
  role: PodChangeRole;
  requested_by: Types.ObjectId;
  /**
   * The venue being replaced (VENUE role), with the slot it holds — snapshotted
   * because the pod's own venue_id and venue_slot_id move the moment a
   * replacement approves, and the row must still say what was given up.
   */
  from_venue_id: Types.ObjectId | null;
  from_venue_slot_id: Types.ObjectId | null;
  /** The club whose admin is being replaced (CLUB_ADMIN role). */
  from_club_id: Types.ObjectId | null;
  reason: string;
  status: PodChangeStatus;
  resolution: PodChangeResolution;
  /** True exactly while status is OPEN or OFFERED — see the class comment. */
  is_open: boolean;
  /**
   * Health points actually deducted when this was filed. Stored rather than
   * re-read: the setting moves, the charge does not.
   */
  health_penalty: number;
  /**
   * Seats taken when it was filed. The admin table shows the LIVE count off the
   * pod; this is the number the requester was shown at the time.
   */
  attendees_at_request: number;
  offer: IPodChangeOffer | null;
  offer_history: IPodChangeOffer[];
  events: IPodChangeEvent[];
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const offerSchema = new Schema<IPodChangeOffer>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', default: null },
    venue_slot_id: { type: Schema.Types.ObjectId, ref: 'VenueSlot', default: null },
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', default: null },
    display_name: { type: String, default: '', trim: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'PASSED'], default: 'PENDING' },
    offered_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    offered_at: { type: Date, default: () => new Date() },
    responded_at: { type: Date, default: null },
    pass_reason: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { _id: false }
);

const eventSchema = new Schema<IPodChangeEvent>(
  {
    action: { type: String, required: true, trim: true },
    actor_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actor_name: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true, maxlength: 500 },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const podChangeRequestSchema = new Schema<IPodChangeRequest>(
  {
    change_request_no: { type: String, default: '', trim: true, index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    role: { type: String, enum: POD_CHANGE_ROLES, required: true, index: true },
    requested_by: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    from_venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', default: null },
    from_venue_slot_id: { type: Schema.Types.ObjectId, ref: 'VenueSlot', default: null },
    from_club_id: { type: Schema.Types.ObjectId, ref: 'Club', default: null },
    reason: { type: String, default: '', trim: true, maxlength: 500 },
    status: { type: String, enum: POD_CHANGE_STATUSES, default: 'OPEN', index: true },
    resolution: { type: String, enum: POD_CHANGE_RESOLUTIONS, default: 'NONE' },
    is_open: { type: Boolean, default: true },
    health_penalty: { type: Number, default: 0, min: 0, max: 10 },
    attendees_at_request: { type: Number, default: 0, min: 0 },
    offer: { type: offerSchema, default: null },
    offer_history: { type: [offerSchema], default: [] },
    events: { type: [eventSchema], default: [] },
    resolved_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// ONE live request per pod per role. Partial, so the closed rows — of which
// there can be many for the same pod and role — are exempt.
podChangeRequestSchema.index(
  { pod_id: 1, role: 1 },
  { unique: true, partialFilterExpression: { is_open: true } }
);
// The admin queue: one tab per role, newest first.
podChangeRequestSchema.index({ role: 1, status: 1, created_at: -1 });
// "What is waiting for ME" — the partner studios' Change Requests section.
podChangeRequestSchema.index({ 'offer.user_id': 1, 'offer.status': 1 });
// "What have I asked for" — the requester's own list on the same section.
podChangeRequestSchema.index({ requested_by: 1, created_at: -1 });

/** Mint the human id once, on the first save. The hook AutoPod uses. */
podChangeRequestSchema.pre('save', async function mintChangeRequestNo(next) {
  if (!this.change_request_no) {
    this.change_request_no = await nextEntityNo('DUN-CRQ', 'pod_change_request');
  }
  next();
});

export const PodChangeRequestModel = model<IPodChangeRequest>(
  'PodChangeRequest',
  podChangeRequestSchema
);
