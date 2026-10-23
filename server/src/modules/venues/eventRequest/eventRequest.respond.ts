/**
 * The owner answers a workshop/event request: Accept, Reject, or Counter with
 * their own date/time. A venue that names its terms (per guest, per hour, per
 * slot or flat) has the window priced by the one venue calculation with its
 * charges, and the price is frozen on the request, so the member sees exactly
 * what the venue quoted even if its rates change later.
 */
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { hasRole } from '@middleware/rbac';
import { consoleEditors } from '@modules/portals/console-access';
import { logs } from '@observability/log';
import { EVENT_REQUEST_NOTE_MAX, EventRequestModel, type IEventRequest } from './eventRequest.model';
import { fail, ownsTarget, parseObjectId } from './eventRequest.target';
import { eventRequestToPub } from './eventRequest.service';
import { quoteOffer, termsProblem } from '@modules/venues/venueOffer/venueOffer.quote';
import type { VenueOfferModel, VenueOfferTerms } from '@modules/venues/venueOffer/venueOffer.types';
import { getAppTimeZone } from '@utils/app-time';

export const EVENT_REQUEST_RESPONSES = ['ACCEPT', 'REJECT', 'COUNTER'] as const;
export type EventRequestResponse = (typeof EVENT_REQUEST_RESPONSES)[number];

export interface EventRequestOfferInput {
  start_at: string;
  end_at: string;
  pax?: number | null;
  /** A venue's price terms for the window; without them the offer carries a time only. */
  model?: VenueOfferModel | null;
  rate?: number | null;
}

/** The venue's quote for its own terms, frozen on the request. */
async function quoteVenueTerms(venueId: string, terms: VenueOfferTerms, start: Date, end: Date, pax: number) {
  const problem = termsProblem(terms);
  if (problem) throw fail('BAD_USER_INPUT', problem);
  const { loadVenue, moneyRates, pricingOf } = await import('@modules/venues/venuePricing/venuePricing.service');
  const [venue, rates] = await Promise.all([loadVenue(venueId), moneyRates(venueId)]);
  const result = quoteOffer(pricingOf(venue), terms, {
    start,
    end,
    pax,
    commissionPct: rates.commissionPct,
    gstPct: rates.gstPct,
    timeZone: getAppTimeZone(),
  });
  if (!result.ok) throw fail('BAD_USER_INPUT', result.message);
  return { ...result.breakdown, confirmed_at: new Date() };
}

const STATUS_OF = { ACCEPT: 'ACCEPTED', REJECT: 'REJECTED', COUNTER: 'COUNTERED' } as const;
/** An answer can still change while nothing is closed: open, or already answered with an offer. */
const ANSWERABLE = ['OPEN', 'ACCEPTED', 'COUNTERED'];

async function priceOffer(doc: IEventRequest, offer: EventRequestOfferInput) {
  const start = new Date(offer.start_at);
  const end = new Date(offer.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw fail('BAD_USER_INPUT', 'Pick a valid start and end time');
  }
  if (start.getTime() <= Date.now()) throw fail('BAD_USER_INPUT', 'Offer a time in the future');
  const pax = Math.max(0, Math.floor(Number(offer.pax) || 0));
  // Only a venue that names its terms quotes a price; otherwise the offer carries a time.
  if (doc.target_type !== 'VENUE' || !offer.model) return { start_at: start, end_at: end, pax, quote: null };
  return {
    start_at: start,
    end_at: end,
    pax,
    quote: await quoteVenueTerms(String(doc.target_id), { model: offer.model, rate: Number(offer.rate) }, start, end, pax),
  };
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

  const priced = offer && action !== 'REJECT' ? await priceOffer(doc, offer) : null;
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
