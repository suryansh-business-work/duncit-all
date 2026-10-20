import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { priceSnapshotSchema } from '@modules/venues/venuePricing/venuePricing.schema.model';
import type { VenuePriceBreakdown } from '@modules/venues/venuePricing/venuePricing.types';

/**
 * "Run something here" — a member's ask, made from the empty state of a host's
 * profile or a venue's Events tab when there is nothing upcoming to join.
 *
 * Different from a venue SUBSCRIBER (venueFood/venueSubscriber): a subscriber
 * hears about EVERY pod at a venue, forever; a request is one open ask that is
 * answered once — the next pod the host or venue publishes closes it as
 * FULFILLED and tells the member, or the owner dismisses it.
 *
 * Target and requester names are copied at request time so the owner's and the
 * console's lists read the same after a rename, and so they are searchable.
 */
export const EVENT_REQUEST_TARGETS = ['HOST', 'VENUE'] as const;
export type EventRequestTarget = (typeof EVENT_REQUEST_TARGETS)[number];

/**
 * OPEN → the owner answers it (ACCEPTED, REJECTED, or COUNTERED with their own
 * date/time and the price their pricing module gives for it), and the next
 * pod they publish closes any still-live one as FULFILLED. DISMISSED is the
 * legacy close and the console's.
 */
export const EVENT_REQUEST_STATUSES = ['OPEN', 'ACCEPTED', 'COUNTERED', 'REJECTED', 'FULFILLED', 'DISMISSED'] as const;
export type EventRequestStatus = (typeof EVENT_REQUEST_STATUSES)[number];

/** Requests a published pod still answers: not yet closed one way or the other. */
export const LIVE_EVENT_REQUEST_STATUSES: readonly EventRequestStatus[] = ['OPEN', 'ACCEPTED', 'COUNTERED'];

/** The owner's offer: a window, the guests, and the price frozen when it was made. */
export interface IEventRequestOffer {
  start_at: Date;
  end_at: Date;
  pax: number;
  quote: (VenuePriceBreakdown & { confirmed_at: Date }) | null;
}

/** The server's bound on the optional note — mirrored by @duncit/forms `EVENT_REQUEST_NOTE_MAX`. */
export const EVENT_REQUEST_NOTE_MAX = 280;

export interface IEventRequest extends Document<Types.ObjectId> {
  target_type: EventRequestTarget;
  /** The venue's id for VENUE; the host's USER id for HOST (what `pod_hosts_id` holds). */
  target_id: Types.ObjectId;
  target_name: string;
  requester_id: Types.ObjectId;
  requester_name: string;
  note: string;
  status: EventRequestStatus;
  /** The pod whose going live closed this request as FULFILLED. */
  fulfilled_pod_id: Types.ObjectId | null;
  closed_at: Date | null;
  /** The account that dismissed it, or null when a published pod closed it. */
  closed_by_id: Types.ObjectId | null;
  /** The owner's answer: a note, and for ACCEPTED/COUNTERED the offered window and its price. */
  response_note: string;
  offer: IEventRequestOffer | null;
  responded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const offerSchema = new Schema<IEventRequestOffer>(
  {
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },
    pax: { type: Number, default: 0, min: 0 },
    quote: { type: priceSnapshotSchema, default: null },
  },
  { _id: false }
);

const eventRequestSchema = new Schema<IEventRequest>(
  {
    target_type: { type: String, enum: EVENT_REQUEST_TARGETS, required: true },
    target_id: { type: Schema.Types.ObjectId, required: true },
    target_name: { type: String, default: '', trim: true },
    requester_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requester_name: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true, maxlength: EVENT_REQUEST_NOTE_MAX },
    status: { type: String, enum: EVENT_REQUEST_STATUSES, default: 'OPEN' },
    fulfilled_pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null },
    closed_at: { type: Date, default: null },
    closed_by_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    response_note: { type: String, default: '', trim: true, maxlength: EVENT_REQUEST_NOTE_MAX },
    offer: { type: offerSchema, default: null },
    responded_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// ONE open request per member per host/venue — the database refuses the
// duplicate, so two taps racing each other still leave a single row. A closed
// request leaves the index, so the member may ask again later.
eventRequestSchema.index(
  { target_type: 1, target_id: 1, requester_id: 1 },
  { unique: true, partialFilterExpression: { status: 'OPEN' } }
);
// The fan-out's read when a pod goes live, a target's counts, and the owner's
// list (scoped by the venues they own NOW, or by themself as host — never by a
// snapshot that a venue changing hands would leave stale).
eventRequestSchema.index({ target_type: 1, target_id: 1, status: 1 });
eventRequestSchema.index({ target_type: 1, target_id: 1, created_at: -1 });
// The consoles' list.
eventRequestSchema.index({ target_type: 1, created_at: -1 });

export const EventRequestModel =
  (mongoose.models.EventRequest as mongoose.Model<IEventRequest>) ||
  mongoose.model<IEventRequest>('EventRequest', eventRequestSchema);
