/**
 * Rented items — the refund side of the contract: where a rental's Razorpay
 * refund stands, the one-rental detail view (Finance and the venue), and the
 * optional proof a person may attach. Copy is the `venueRentals` namespace.
 *
 * The SERVER decides every state and amount (rentalRefundState.ts) and checks
 * every proof; the lists and limits here only mirror it so the consoles and the
 * app render and validate the same way before a round trip.
 */

import { RENTAL_BOOKING_FIELDS, type RentalBookingRow } from './venue-rentals';

export type RentalRefundState =
  | 'NOT_ELIGIBLE'
  | 'AWAITING_RETURN'
  | 'ELIGIBLE'
  | 'PROCESSING'
  | 'REFUNDED'
  | 'FAILED'
  | 'REQUIRES_REVIEW'
  | 'IN_PAYMENT';

export const RENTAL_REFUND_STATES: readonly RentalRefundState[] = [
  'NOT_ELIGIBLE',
  'AWAITING_RETURN',
  'ELIGIBLE',
  'PROCESSING',
  'REFUNDED',
  'FAILED',
  'REQUIRES_REVIEW',
  'IN_PAYMENT',
];

// Every key written out whole: the translation gate finds keys by their literal text.
const REFUND_STATE_KEY: Record<RentalRefundState, string> = {
  NOT_ELIGIBLE: 'venueRentals.refundState.NOT_ELIGIBLE',
  AWAITING_RETURN: 'venueRentals.refundState.AWAITING_RETURN',
  ELIGIBLE: 'venueRentals.refundState.ELIGIBLE',
  PROCESSING: 'venueRentals.refundState.PROCESSING',
  REFUNDED: 'venueRentals.refundState.REFUNDED',
  FAILED: 'venueRentals.refundState.FAILED',
  REQUIRES_REVIEW: 'venueRentals.refundState.REQUIRES_REVIEW',
  IN_PAYMENT: 'venueRentals.refundState.IN_PAYMENT',
};

/** The tone a refund state is shown in, so every surface colours it alike. */
export type RentalRefundTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';
const REFUND_STATE_TONE: Record<RentalRefundState, RentalRefundTone> = {
  NOT_ELIGIBLE: 'neutral',
  AWAITING_RETURN: 'info',
  ELIGIBLE: 'info',
  PROCESSING: 'info',
  REFUNDED: 'success',
  FAILED: 'warning',
  REQUIRES_REVIEW: 'error',
  IN_PAYMENT: 'success',
};

const isRefundState = (value: unknown): value is RentalRefundState =>
  RENTAL_REFUND_STATES.includes(String(value) as RentalRefundState);

/**
 * A row's refund state. An older server sends none: read it from the old
 * fields the way the server would, never guessing a refund happened. Status
 * fields read as plain strings: the app's generated types type them `string`.
 */
export function rentalRefundStateOf(
  row: Pick<RentalBookingRow, 'deposit_amount' | 'refund_due'> & { status: unknown; refund_status: unknown; refund_state?: string | null }
): RentalRefundState {
  if (isRefundState(row.refund_state)) return row.refund_state;
  if (String(row.status) === 'BOOKED') return row.deposit_amount > 0 ? 'AWAITING_RETURN' : 'NOT_ELIGIBLE';
  if (String(row.refund_status) === 'IN_PAYMENT') return 'IN_PAYMENT';
  if (!(row.refund_due > 0)) return 'NOT_ELIGIBLE';
  return String(row.refund_status) === 'DUE' ? 'ELIGIBLE' : 'REQUIRES_REVIEW';
}

export const rentalRefundStateKey = (state: unknown) => REFUND_STATE_KEY[isRefundState(state) ? state : 'NOT_ELIGIBLE'];
export const rentalRefundTone = (state: unknown): RentalRefundTone => REFUND_STATE_TONE[isRefundState(state) ? state : 'NOT_ELIGIBLE'];

const EVENT_KEY: Record<string, string> = {
  BOOKED: 'venueRentals.event.BOOKED',
  UNAVAILABLE: 'venueRentals.event.UNAVAILABLE',
  CANCELLED: 'venueRentals.event.CANCELLED',
  RELEASED: 'venueRentals.event.RELEASED',
  RETURNED: 'venueRentals.event.RETURNED',
  DAMAGED: 'venueRentals.event.DAMAGED',
  AUTO_RELEASED: 'venueRentals.event.AUTO_RELEASED',
  RESTORED: 'venueRentals.event.RESTORED',
  REFUND_QUEUED: 'venueRentals.event.REFUND_QUEUED',
  REFUND_PROCESSING: 'venueRentals.event.REFUND_PROCESSING',
  REFUND_SUCCEEDED: 'venueRentals.event.REFUND_SUCCEEDED',
  REFUND_FAILED: 'venueRentals.event.REFUND_FAILED',
  REFUND_REVIEW: 'venueRentals.event.REFUND_REVIEW',
  FINANCE_SENT_REFUND: 'venueRentals.event.FINANCE_SENT_REFUND',
  MANUAL_REFUND_MARK: 'venueRentals.event.MANUAL_REFUND_MARK',
  MANUAL_MARK_VOIDED: 'venueRentals.event.MANUAL_MARK_VOIDED',
  PROOF_ADDED: 'venueRentals.event.PROOF_ADDED',
  NOTIFIED: 'venueRentals.event.NOTIFIED',
};
const ACTOR_KEY: Record<string, string> = {
  SYSTEM: 'venueRentals.actor.SYSTEM',
  FINANCE: 'venueRentals.actor.FINANCE',
  VENUE: 'venueRentals.actor.VENUE',
  GUEST: 'venueRentals.actor.GUEST',
  RAZORPAY: 'venueRentals.actor.RAZORPAY',
};
const GATEWAY_STATUS_KEY: Record<string, string> = {
  QUEUED: 'venueRentals.gatewayStatus.QUEUED',
  SENDING: 'venueRentals.gatewayStatus.SENDING',
  PROCESSING: 'venueRentals.gatewayStatus.PROCESSING',
  SUCCEEDED: 'venueRentals.gatewayStatus.SUCCEEDED',
  FAILED: 'venueRentals.gatewayStatus.FAILED',
  RECONCILIATION_REQUIRED: 'venueRentals.gatewayStatus.RECONCILIATION_REQUIRED',
  NOT_APPLICABLE: 'venueRentals.gatewayStatus.NOT_APPLICABLE',
};
const SOURCE_KEY: Record<string, string> = {
  RENTAL: 'venueRentals.detail.sourceRENTAL',
  POD_CANCELLATION: 'venueRentals.detail.sourcePOD_CANCELLATION',
};

/** Label keys for the detail view. A value a newer server adds falls back to a neutral label, never a raw key. */
export const rentalEventKey = (type: unknown): string => EVENT_KEY[String(type)] ?? 'venueRentals.event.BOOKED';
export const rentalActorKey = (role: unknown): string => ACTOR_KEY[String(role)] ?? 'venueRentals.actor.SYSTEM';
export const rentalGatewayStatusKey = (status: unknown): string =>
  GATEWAY_STATUS_KEY[String(status)] ?? 'venueRentals.gatewayStatus.QUEUED';
export const rentalRefundSourceKey = (source: unknown): string => SOURCE_KEY[String(source)] ?? 'venueRentals.detail.sourceRENTAL';

/** Only a refund waiting for review can be sent again by Finance — through Razorpay, never marked paid. */
export const canSendRentalRefund = (row: Parameters<typeof rentalRefundStateOf>[0]) =>
  rentalRefundStateOf(row) === 'REQUIRES_REVIEW';

/** Proof limits, the server's own (rentalBooking.model.ts). */
export const RENTAL_PROOF_NOTE_MAX = 1000;
export const RENTAL_PROOF_IMAGES_MAX = 6;
/** The shortest note Finance leaves when it sends a reviewed refund (rentalRefund.service.ts). */
export const RENTAL_REFUND_NOTE_MIN = 10;

export interface RentalPerson {
  id: string | null;
  name: string;
  phone: string | null;
  /** Finance only. */
  email: string | null;
}

export interface RentalVenueContact {
  id: string;
  name: string;
  contact_name: string;
  phone: string | null;
  /** Finance only. */
  email: string | null;
  address: string;
}

export interface RentalPodInfo {
  id: string;
  /** Public ids: the pod page is /club/<club_public_id>/pod/<public_id>. */
  public_id: string;
  club_public_id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
}

export interface RentalPaymentInfo {
  payment_doc_id: string;
  payment_ref: string;
  gateway: string;
  razorpay_payment_id: string | null;
  total: number;
  status: string;
  paid_at: string | null;
}

export interface RentalRefundAttempt {
  id: string;
  /** RENTAL or POD_CANCELLATION. */
  source: string;
  status: string;
  amount: number;
  razorpay_refund_id: string | null;
  attempts: number;
  last_error: string;
  requested_at: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface RentalProof {
  note: string;
  image_urls: string[];
  added_by_name: string;
  added_by_role: string;
  added_at: string;
}

export interface RentalEvent {
  type: string;
  at: string;
  actor_name: string;
  actor_role: string;
  amount: number | null;
  detail: string;
}

export interface RentalBookingDetail {
  booking: RentalBookingRow;
  /** FINANCE or VENUE. */
  viewer: string;
  guest: RentalPerson;
  venue: RentalVenueContact;
  pod: RentalPodInfo | null;
  /** Finance only. */
  payment: RentalPaymentInfo | null;
  refunds: RentalRefundAttempt[];
  proofs: RentalProof[];
  events: RentalEvent[];
}

export interface RentalProofValues {
  note: string;
  image_urls: string[];
}

const DETAIL_FIELDS = `booking { ${RENTAL_BOOKING_FIELDS} } viewer
  guest { id name phone email }
  venue { id name contact_name phone email address }
  pod { id public_id club_public_id title starts_at ends_at }
  payment { payment_doc_id payment_ref gateway razorpay_payment_id total status paid_at }
  refunds { id source status amount razorpay_refund_id attempts last_error requested_at processed_at created_at }
  proofs { note image_urls added_by_name added_by_role added_at }
  events { type at actor_name actor_role amount detail }`;

export const RENTAL_BOOKING_DETAIL_QUERY = `query RentalBookingDetail($id: ID!) {
  rentalBookingDetail(id: $id) { ${DETAIL_FIELDS} }
}`;

export const SEND_RENTAL_REFUND_MUTATION = `mutation SendRentalRefund($id: ID!, $note: String!) {
  sendRentalRefund(id: $id, note: $note) { ${DETAIL_FIELDS} }
}`;

export const ADD_RENTAL_BOOKING_PROOF_MUTATION = `mutation AddRentalBookingProof($id: ID!, $input: RentalProofInput!) {
  addRentalBookingProof(id: $id, input: $input) { ${DETAIL_FIELDS} }
}`;

/** The pod page a rental's pod opens on mWeb, or null when the pod is gone. */
export const rentalPodPath = (pod: Pick<RentalPodInfo, 'public_id' | 'club_public_id'> | null): string | null =>
  pod?.public_id && pod.club_public_id ? `/club/${pod.club_public_id}/pod/${pod.public_id}` : null;

/** The refund sentence a guest reads on a rental, and the amount it names. */
export interface RentalGuestRefundLine {
  key: string;
  amount: number;
}

type GuestRefundRow = Parameters<typeof rentalRefundStateOf>[0] &
  Pick<RentalBookingRow, 'damage_claim'> &
  Partial<Pick<RentalBookingRow, 'refunded_amount' | 'refund_outstanding'>>;

// Every key written out whole: the translation gate finds keys by their literal text.
const GUEST_REFUND_KEY: Partial<Record<RentalRefundState, string>> = {
  AWAITING_RETURN: 'venueRentals.guest.depositBack',
  ELIGIBLE: 'venueRentals.guest.refundProcessing',
  PROCESSING: 'venueRentals.guest.refundProcessing',
  FAILED: 'venueRentals.guest.refundProcessing',
  REQUIRES_REVIEW: 'venueRentals.guest.refundReview',
  REFUNDED: 'venueRentals.guest.refunded',
  IN_PAYMENT: 'venueRentals.guest.refunded',
};

const positiveOr = (value: number | null | undefined, fallback: number) =>
  typeof value === 'number' && value > 0 ? value : fallback;

function guestRefundAmount(state: RentalRefundState, row: GuestRefundRow): number {
  if (state === 'AWAITING_RETURN') return row.deposit_amount;
  if (state === 'REFUNDED') return positiveOr(row.refunded_amount, row.refund_due);
  if (state === 'IN_PAYMENT') return row.refund_due;
  return positiveOr(row.refund_outstanding, row.refund_due);
}

/**
 * The one refund line My Rented Items prints on mWeb and the app. It reads
 * "Refunded" only once Razorpay confirmed it (or the pod cancellation's own
 * refund carried it); anything owed and unconfirmed reads processing or under
 * review. With no refund owed, the damage kept is said instead, or nothing.
 */
export function rentalGuestRefundLine(row: GuestRefundRow): RentalGuestRefundLine | null {
  const state = rentalRefundStateOf(row);
  const key = GUEST_REFUND_KEY[state];
  const amount = key ? guestRefundAmount(state, row) : 0;
  if (key && amount > 0) return { key, amount };
  return row.damage_claim > 0 ? { key: 'venueRentals.guest.damageKept', amount: row.damage_claim } : null;
}
