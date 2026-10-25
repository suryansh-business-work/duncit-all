/**
 * Every move of a booking offer, as a line in the pod's venue chat — where the
 * two sides bargain. The line carries the terms as they stood (the booking
 * hold is deleted when an offer is declined or expires, so the thread is the
 * negotiation's record) and a one-line summary: the inbox preview, and what an
 * app build from before offer lines shows in place of the offer card.
 */
import type { IVenueSlot } from '@modules/venues/venueSlot/venueSlot.model';
import type { VenueChatOfferEvent, VenueChatOfferPayload } from '@microservices/chat/venue/venueChat.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { logs } from '@observability/log';
import type { VenueOfferProposal } from './venueOffer.types';

/** The words a summary uses for each pricing model. */
const MODEL_WORDS: Record<string, string> = {
  PER_GUEST: 'per guest',
  PER_HOUR: 'per hour',
  PER_SLOT: 'for the slot',
  FLAT: 'flat',
};

const LEAD: Record<VenueChatOfferEvent, string> = {
  OFFER: 'Booking offer',
  COUNTER: 'Counter offer',
  ACCEPTED: 'Offer accepted',
  DECLINED: 'Offer declined',
  EXPIRED: 'Offer expired — no answer in time',
};

const money = (symbol: string, value: number) =>
  `${symbol}${(Math.round(value * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const range = (symbol: string, low: number, high: number) =>
  low === high ? money(symbol, high) : `${money(symbol, low)}–${money(symbol, high)}`;

/** The move's terms, frozen into the line. */
export function offerLinePayload(
  slot: Pick<IVenueSlot, '_id' | 'start_at' | 'end_at' | 'space_label' | 'offer'>,
  terms: VenueOfferProposal,
  move: { event: VenueChatOfferEvent; by: VenueChatOfferPayload['by']; round: number; expiresAt: Date | null; reason?: string }
): VenueChatOfferPayload {
  const offer = slot.offer;
  const maxGuests = offer?.pax ?? 0;
  const atLeast = terms.quote_min ?? terms.quote;
  return {
    slot_id: String(slot._id),
    round: move.round,
    event: move.event,
    by: move.by,
    model: terms.model,
    rate: terms.rate,
    min_guests: terms.min_guests || maxGuests,
    max_guests: maxGuests,
    offerings: [...(terms.offerings ?? [])],
    note: terms.note ?? '',
    start_at: slot.start_at,
    end_at: slot.end_at,
    space_label: slot.space_label ?? '',
    pets: !!offer?.pets,
    venue_receives_min: atLeast.venue_payout,
    venue_receives_max: terms.quote.venue_payout,
    total_min: atLeast.total,
    total_max: terms.quote.total,
    expires_at: move.expiresAt,
    reason: (move.reason ?? '').trim(),
  };
}

/** The one-line summary: what was offered, for how many, and what the venue receives. */
export function offerLineText(payload: VenueChatOfferPayload, currencySymbol: string): string {
  const lead = LEAD[payload.event];
  if (payload.event === 'EXPIRED') return lead;
  if (payload.event === 'DECLINED') return payload.reason ? `${lead}: ${payload.reason}` : lead;
  const guests =
    payload.min_guests === payload.max_guests ? `${payload.max_guests} guests` : `${payload.min_guests}–${payload.max_guests} guests`;
  const terms = `${money(currencySymbol, payload.rate)} ${MODEL_WORDS[payload.model] ?? ''}`.trim();
  const receives = range(currencySymbol, payload.venue_receives_min, payload.venue_receives_max);
  return `${lead}: ${terms} · ${guests} · venue receives ${receives}`;
}

/** Who the line is posted as: the side that moved — a late answer is posted on the side whose terms ran out. */
function postedAs(slot: Pick<IVenueSlot, 'owner_user_id'>, hostId: string, side: 'HOST' | 'VENUE') {
  return side === 'VENUE' ? String(slot.owner_user_id) : hostId;
}

/** The platform's currency symbol, for summaries written on the server. */
async function currencySymbol(): Promise<string> {
  return (await getFinanceSettings()).currency_symbol || '₹';
}

/**
 * Posts the move into the pod's venue chat and returns its one-line summary
 * (the caller's in-app note says the same). Best-effort and never throws: a
 * move that was made stays made, whatever happens to its line.
 */
export async function postOfferLine(args: {
  podId: string;
  slot: Pick<IVenueSlot, '_id' | 'start_at' | 'end_at' | 'space_label' | 'offer' | 'owner_user_id'>;
  terms: VenueOfferProposal;
  side: 'HOST' | 'VENUE';
  /** The host the line is posted as when `side` is HOST (the mover, or the lead host). */
  hostId: string;
  move: Parameters<typeof offerLinePayload>[2];
}): Promise<string> {
  const payload = offerLinePayload(args.slot, args.terms, args.move);
  let text = LEAD[args.move.event];
  try {
    text = offerLineText(payload, await currencySymbol());
    const { venueChatService } = await import('@microservices/chat/venue/venueChat.service');
    await venueChatService.postOffer({
      podId: args.podId,
      side: args.side,
      userId: postedAs(args.slot, args.hostId, args.side),
      text,
      offer: payload,
    });
  } catch (error) {
    logs.server.error('venueOffer', 'postOfferLine', { error, pod_id: args.podId, event: args.move.event });
  }
  return text;
}
