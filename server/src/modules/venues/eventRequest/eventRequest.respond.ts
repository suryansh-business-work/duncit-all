/**
 * The owner answers a workshop/event request: Accept, Reject, or Counter with
 * their own date/time. Any offered window is priced by the venue's pricing
 * module (the one calculation) and the price is frozen on the request, so the
 * member sees exactly what the venue quoted even if its rates change later.
 */
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { hasRole } from '@middleware/rbac';
import { consoleEditors } from '@modules/portals/console-access';
import { logs } from '@observability/log';
import { EVENT_REQUEST_NOTE_MAX, EventRequestModel, type IEventRequest } from './eventRequest.model';
import { fail, ownsTarget, parseObjectId } from './eventRequest.target';
import { eventRequestToPub } from './eventRequest.service';

export const EVENT_REQUEST_RESPONSES = ['ACCEPT', 'REJECT', 'COUNTER'] as const;
export type EventRequestResponse = (typeof EVENT_REQUEST_RESPONSES)[number];

export interface EventRequestOfferInput {
  start_at: string;
  end_at: string;
  pax?: number | null;
}

const STATUS_OF = { ACCEPT: 'ACCEPTED', REJECT: 'REJECTED', COUNTER: 'COUNTERED' } as const;
/** An answer can still change while nothing is closed: open, or already answered with an offer. */
const ANSWERABLE = ['OPEN', 'ACCEPTED', 'COUNTERED'];

async function priceOffer(user: AuthUser, doc: IEventRequest, offer: EventRequestOfferInput) {
  const start = new Date(offer.start_at);
  const end = new Date(offer.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw fail('BAD_USER_INPUT', 'Pick a valid start and end time');
  }
  if (start.getTime() <= Date.now()) throw fail('BAD_USER_INPUT', 'Offer a time in the future');
  const pax = Math.max(0, Math.floor(Number(offer.pax) || 0));
  // Only a venue has a pricing module; a host's offer carries a time, not a price.
  if (doc.target_type !== 'VENUE') return { start_at: start, end_at: end, pax, quote: null };
  const { venuePricingService } = await import('@modules/venues/venuePricing/venuePricing.service');
  const quote = await venuePricingService.quote(user.id, String(doc.target_id), {
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    pax,
  });
  return { start_at: start, end_at: end, pax, quote: { ...quote, confirmed_at: new Date() } };
}

/** Best-effort in-app note to the member who asked. Never fails the answer. */
async function tellRequester(doc: IEventRequest) {
  try {
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    const body: Record<string, string> = {
      ACCEPTED: `${doc.target_name} accepted your event request.`,
      COUNTERED: `${doc.target_name} suggested another time for your event request.`,
      REJECTED: `${doc.target_name} cannot take your event request.`,
    };
    await notificationService.create({
      title: 'Your event request was answered',
      body: body[doc.status] ?? body.ACCEPTED,
      scope: 'USER',
      target_user_ids: [String(doc.requester_id)],
    });
  } catch (error) {
    logs.server.warn('event-request', 'tellRequester', { error, id: String(doc._id) });
  }
}

/** Accept, reject or counter a request — its owner or the console's editors. */
export async function respondToEventRequest(
  user: AuthUser,
  id: string,
  response: string,
  note?: string | null,
  offer?: EventRequestOfferInput | null
) {
  if (!(EVENT_REQUEST_RESPONSES as readonly string[]).includes(response)) throw fail('BAD_USER_INPUT', 'Invalid response');
  const action = response as EventRequestResponse;
  const doc = await EventRequestModel.findById(parseObjectId(id, 'request id'));
  if (!doc) throw fail('NOT_FOUND', 'Request not found');
  const entity = doc.target_type === 'VENUE' ? 'VENUE' : 'HOST';
  const staff = hasRole(user, consoleEditors(entity));
  if (!staff && !(await ownsTarget(doc.target_type, doc.target_id, user.id))) throw fail('FORBIDDEN', 'Access Denied');
  if (!ANSWERABLE.includes(doc.status)) throw fail('CONFLICT', 'This request is already closed');
  if (action === 'COUNTER' && !offer) throw fail('BAD_USER_INPUT', 'Offer a date and time');
  const text = String(note ?? '').trim();
  if (text.length > EVENT_REQUEST_NOTE_MAX) throw fail('BAD_USER_INPUT', `Keep the note under ${EVENT_REQUEST_NOTE_MAX} characters`);

  const priced = offer && action !== 'REJECT' ? await priceOffer(user, doc, offer) : null;
  const closing = action === 'REJECT';
  const updated = await EventRequestModel.findOneAndUpdate(
    { _id: doc._id, status: { $in: ANSWERABLE } },
    {
      $set: {
        status: STATUS_OF[action],
        response_note: text,
        offer: priced,
        responded_at: new Date(),
        closed_at: closing ? new Date() : null,
        closed_by_id: closing ? new Types.ObjectId(user.id) : null,
      },
    },
    { new: true }
  );
  if (!updated) throw fail('CONFLICT', 'This request is already closed');
  logs.server.info('event-request', 'respond', { id, response: action, by_staff: staff });
  await tellRequester(updated);
  return eventRequestToPub(updated);
}
