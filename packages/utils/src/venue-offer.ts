/**
 * Venue offers — the host side of booking a venue, shared by mWeb, the native
 * app and the Partners pod form (rules 29 + 56).
 *
 * The host picks a window the venue is open and free, the guests, and how they
 * will pay the venue (per guest, per hour, or a flat price for the window) with
 * an amount, lists what they need from the venue and may add a note. The server
 * prices that offer with the venue's own charges (price rules, fees, minimum
 * spend, GST) and Duncit's commission on top (`venueOfferQuote`) at both ends
 * of the guests — the venue's minimum and the pod's spots; the venue then
 * accepts, rejects or counters it, and the host may counter back. This module
 * never prices anything: it builds the input, names the choices, and carries
 * the operations as SDL strings.
 */
import {
  bookingClosedTiles,
  bookingDayOf,
  bookingEndOptions,
  bookingSpaceLabel,
  bookingTiles,
  type BookingCalendarDay,
  type BookingRules,
  type BookingTile,
} from './venue-booking';
import { FREE_JUSTIFICATION_FIELDS, freeJustificationInput, type FreeJustificationInput, type FreeJustificationSource } from './free-arrangement';

/** How the host offers to pay the venue (`VenueOfferModel`): the priced options. */
export type VenueOfferModel = 'PER_GUEST' | 'PER_HOUR' | 'FLAT';

/** The pricing options, in the order the pickers list them (counters and the venue's guide use these). */
export const VENUE_OFFER_MODELS: readonly VenueOfferModel[] = ['PER_GUEST', 'PER_HOUR', 'FLAT'];

/**
 * The venue gives the window for nothing. Only a host's opening offer (Create
 * Pod, resubmit) may name it, with a free justification (`free-arrangement`);
 * no amount is asked, the venue accepts or declines, and nobody counters.
 */
export const FREE_VENUE_OFFER_MODEL = 'FREE' as const;

/** What a host's opening offer may name: the priced options, then free. */
export type HostOfferModel = VenueOfferModel | typeof FREE_VENUE_OFFER_MODEL;

/** The opening offer's options, in picker order. */
export const HOST_OFFER_MODELS: readonly HostOfferModel[] = [...VENUE_OFFER_MODELS, FREE_VENUE_OFFER_MODEL];

/** The free option's name and its one line on what it means. */
export const FREE_VENUE_OFFER_KEY = { label: 'mweb.createPod.offer.model.free', help: 'mweb.createPod.offer.help.free' } as const;

/** Whether a plain string is an opening-offer option (priced, or FREE). */
export const isHostOfferModel = (model: string | null | undefined): model is HostOfferModel =>
  model === FREE_VENUE_OFFER_MODEL || isVenueOfferModel(model);

/** Whether the offer is a free venue. */
export const isFreeVenueOfferModel = (model: string | null | undefined): boolean => model === FREE_VENUE_OFFER_MODEL;

/** Each pricing option's name, the label of its amount field, and one line on how it pays. */
export const VENUE_OFFER_MODEL_KEY: Readonly<Record<VenueOfferModel, { label: string; rate: string; help: string }>> = {
  PER_GUEST: {
    label: 'mweb.createPod.offer.model.perGuest',
    rate: 'mweb.createPod.offer.rate.perGuest',
    help: 'mweb.createPod.offer.help.perGuest',
  },
  PER_HOUR: {
    label: 'mweb.createPod.offer.model.perHour',
    rate: 'mweb.createPod.offer.rate.perHour',
    help: 'mweb.createPod.offer.help.perHour',
  },
  FLAT: { label: 'mweb.createPod.offer.model.flat', rate: 'mweb.createPod.offer.rate.flat', help: 'mweb.createPod.offer.help.flat' },
};

/** Whether a plain string (either app's generated enum value) is a pricing option. */
export const isVenueOfferModel = (model: string | null | undefined): model is VenueOfferModel =>
  !!model && (VENUE_OFFER_MODELS as readonly string[]).includes(model);

/** The option's name key (free included), or '' for one this client does not know. */
export function venueOfferModelKey(model: string | null | undefined): string {
  if (isFreeVenueOfferModel(model)) return FREE_VENUE_OFFER_KEY.label;
  return isVenueOfferModel(model) ? VENUE_OFFER_MODEL_KEY[model].label : '';
}

/** The option's one-line help key (free included), or '' for one this client does not know. */
export function venueOfferHelpKey(model: string | null | undefined): string {
  if (isFreeVenueOfferModel(model)) return FREE_VENUE_OFFER_KEY.help;
  return isVenueOfferModel(model) ? VENUE_OFFER_MODEL_KEY[model].help : '';
}

/** Where an offer stands (`VenueOfferStatus`), as the host is told. */
export const VENUE_OFFER_STATUS_KEY: Readonly<Record<string, string>> = {
  SENT: 'mweb.venueOffer.status.sent',
  COUNTERED: 'mweb.venueOffer.status.countered',
  ACCEPTED: 'mweb.venueOffer.status.accepted',
  DECLINED: 'mweb.venueOffer.status.declined',
};

/** The status's key, or '' for one this client does not know. */
export const venueOfferStatusKey = (status: string | null | undefined): string =>
  (status && VENUE_OFFER_STATUS_KEY[status]) || '';

/** Each option's terms written out, e.g. "₹300 per guest" (`{amount}` = the money). */
export const VENUE_OFFER_TERMS_KEY: Readonly<Record<VenueOfferModel, string>> = {
  PER_GUEST: 'mweb.venueOffer.terms.perGuest',
  PER_HOUR: 'mweb.venueOffer.terms.perHour',
  FLAT: 'mweb.venueOffer.terms.flat',
};

/** The `t` either app passes in. */
type OfferTranslate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

/** One side's terms as a line ("₹300 per guest", "Free venue"), or just the money for an unknown option. */
export function venueOfferTermsText(
  model: string | null | undefined,
  rate: number,
  t: OfferTranslate,
  money: (rupees: number) => string
): string {
  if (isFreeVenueOfferModel(model)) return t('mweb.venueOffer.terms.free');
  const amount = money(rate);
  return isVenueOfferModel(model) ? t(VENUE_OFFER_TERMS_KEY[model], { vars: { amount } }) : amount;
}

/**
 * "8–20 guests" when the venue is paid for fewer than the booking's guests,
 * else "20 guests" — `availability.offers.*`, which every surface ships.
 */
export function offerGuestsText(t: OfferTranslate, minGuests: number, maxGuests: number): string {
  if (minGuests > 0 && minGuests < maxGuests) return t('availability.offers.guestRange', { vars: { min: minGuests, max: maxGuests } });
  return t('availability.offers.guests', { vars: { n: maxGuests } });
}

/** Who moves next on an offer (`VenueOfferParty`). */
export type VenueOfferParty = 'HOST' | 'VENUE';

/**
 * How many counter offers each side may make on a booking (Pod Settings splits
 * a total equally) and how many each has made. Absent from older servers.
 */
export interface OfferCounterUsage {
  counters_per_side?: number | null;
  host_counters_used?: number | null;
  venue_counters_used?: number | null;
}

/** One side's share and what is left of it, or null when the server names no limit. */
function counterShare(offer: Readonly<OfferCounterUsage>, side: VenueOfferParty): { left: number; of: number } | null {
  const perSide = offer.counters_per_side;
  if (perSide === undefined || perSide === null) return null;
  const used = (side === 'HOST' ? offer.host_counters_used : offer.venue_counters_used) ?? 0;
  return { left: Math.max(0, perSide - used), of: perSide };
}

/** Counters `side` may still make, or null when the server does not say (no limit known). */
export function offerCountersLeft(offer: Readonly<OfferCounterUsage>, side: VenueOfferParty): number | null {
  return counterShare(offer, side)?.left ?? null;
}

/**
 * The `{ left, of }` a "counters left" line names for one side — its share and
 * what is left of it — or null when no limit is known, or when the booking
 * takes no counters at all (a free one: accepted or declined, so there is no
 * share to count down).
 */
export function offerCounterAllowance(offer: Readonly<OfferCounterUsage>, side: VenueOfferParty): { left: number; of: number } | null {
  const share = counterShare(offer, side);
  return share && share.of > 0 ? share : null;
}

/** Whether `side` may still counter: always, when the server names no limit. */
export const mayCounter = (offer: Readonly<OfferCounterUsage>, side: VenueOfferParty): boolean => offerCountersLeft(offer, side) !== 0;

/**
 * Each basis a venue may name the business it hopes for on (Booking offers),
 * and how an amount reads: "₹200 per guest", "₹400 per hour", "₹5,000 per
 * booking". A flat price is one amount for the whole booking.
 */
export const VENUE_MIN_BUSINESS_KEY: Readonly<Record<VenueOfferModel, { label: string; amount: string }>> = {
  PER_GUEST: { label: 'availability.offers.minBusiness.perGuest', amount: 'availability.offers.minBusiness.perGuestAmount' },
  PER_HOUR: { label: 'availability.offers.minBusiness.perHour', amount: 'availability.offers.minBusiness.perHourAmount' },
  FLAT: { label: 'availability.offers.minBusiness.perBooking', amount: 'availability.offers.minBusiness.perBookingAmount' },
};

/** One amount a venue hopes for (`VenueMinBusiness`). */
export interface VenueMinBusinessRow {
  model: string;
  amount: number;
}

/**
 * The amounts as lines ("₹200 per guest"), on the bases this client knows, in
 * the pickers' order — what Create Pod shows once the venue is picked. `money`
 * is the surface's formatter.
 */
export function venueMinBusinessLines(
  rows: readonly VenueMinBusinessRow[] | null | undefined,
  t: (key: string, opts?: { vars?: Record<string, string | number> }) => string,
  money: (rupees: number) => string
): string[] {
  return VENUE_OFFER_MODELS.flatMap((model) => {
    const row = (rows ?? []).find((entry) => entry.model === model);
    return row && row.amount > 0 ? [t(VENUE_MIN_BUSINESS_KEY[model].amount, { vars: { amount: money(row.amount) } })] : [];
  });
}

/** Whether the host now has the venue's counter to accept or reject. */
export const hostMayAnswerCounter = (offer: { status?: string | null; awaiting?: string | null } | null | undefined): boolean =>
  offer?.status === 'COUNTERED' && offer.awaiting === 'HOST';

/**
 * What the host may do with their pod's offer now: answer the venue's counter
 * (accept it, reject it, or counter back while counters are left) while it waits
 * on them, or send a new offer once the last one was declined.
 */
export function hostOfferActions(
  offer: ({ status?: string | null; awaiting?: string | null } & OfferCounterUsage) | null | undefined
) {
  const answering = hostMayAnswerCounter(offer);
  // Countering back stops once the host has used every counter Pod Settings allows them.
  const counter = answering && !!offer && mayCounter(offer, 'HOST');
  return { accept: answering, reject: answering, counter, sendNew: offer?.status === 'DECLINED' };
}

/**
 * The fewest guests a new offer to a venue may be for: the venue's minimum
 * (`offer_min_guests` — its setting, else the platform's default), never more
 * than the space it books holds — the server's `openingMinGuests`, so every
 * spots picker floors where the server would. 0 when the venue names none.
 */
export function offerGuestFloor(venueMinimum: number | null | undefined, capacity: number | null | undefined): number {
  const minimum = Math.max(0, Math.floor(Number(venueMinimum) || 0));
  const cap = Math.max(0, Math.floor(Number(capacity) || 0));
  return cap > 0 ? Math.min(minimum, cap) : minimum;
}

/** The server's bounds on what a host asks of a venue (venueOffer `OFFER_ASK_LIMITS`). */
export const VENUE_OFFER_ASK_LIMITS = { offerings: 20, offeringLength: 120, note: 1000 } as const;

/** A bullet someone typed at the start of a point ("- ", "* ", "• "). */
const LEADING_BULLET = /^[-*•]\s*/;

/**
 * The points typed into "What you need from the venue", one per line: each
 * trimmed, a leading bullet dropped, blank lines left out. The server cleans
 * the same way and enforces `VENUE_OFFER_ASK_LIMITS`.
 */
export function offeringsFromText(text: string | null | undefined): string[] {
  return String(text ?? '')
    .split('\n')
    .map((line) => line.trim().replace(LEADING_BULLET, '').trim())
    .filter(Boolean);
}

/** The points back as the box's text, one per line — how a form starts from terms already sent. */
export const offeringsToText = (offerings: readonly string[] | null | undefined): string => (offerings ?? []).join('\n');

/** What a pod sends as `venue_offer` (VenueOfferInput). */
export interface VenueOfferInput {
  start_at: string;
  end_at: string;
  space_label: string;
  pax: number;
  pets: boolean;
  model: HostOfferModel;
  /** 0 for a free venue. */
  rate: number;
  /** What the venue should provide, one point each (Create Pod requires one). */
  offerings?: string[];
  /** Anything else asked of the venue. */
  note?: string;
  /** Why a free venue is free — required with FREE. */
  free_justification?: FreeJustificationInput;
}

/** What a form holds for an offer. `rate` is the typed amount (text or number). */
export interface VenueOfferSource {
  start: string | null;
  end: string | null;
  /** The guests — on Create Pod always the pod's spots. */
  pax: number;
  pets: boolean;
  /** The space picked on the form (`WHOLE_VENUE_SPACE` for the whole venue). */
  spaceLabel: string;
  model: string | null | undefined;
  rate: string | number | null | undefined;
  /** The points as typed, one per line. Left out, the input carries none. */
  offerings?: string | null;
  /** The note as typed. Left out, the input carries none. */
  note?: string | null;
  /** The free justification as the form holds it; read only for a FREE offer. */
  freeJustification?: FreeJustificationSource | null;
}

/** The typed amount as rupees: a positive finite number, else 0 (nothing offered). */
export function offerRateOf(rate: string | number | null | undefined): number {
  const value = typeof rate === 'number' ? rate : Number(String(rate ?? '').trim());
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

/**
 * The terms of an offer the venue declined (or let expire), as the venue chat's
 * "Send a new offer" hands them to the resubmit form — a chat line's move
 * satisfies it — so a new offer is an edit of the last one.
 */
export interface VenueOfferPrefill {
  model: string;
  rate: number;
  offerings: readonly string[];
  note: string;
  start_at: string;
  end_at: string;
  space_label: string;
  pets: boolean;
}

/** A declined offer's terms as the resubmit forms (mWeb, Partners, the app) hold them. */
export function venueOfferPrefillValues(prefill: Readonly<VenueOfferPrefill>) {
  return {
    offer_start: prefill.start_at,
    offer_end: prefill.end_at,
    space_label: prefill.space_label,
    pets: prefill.pets,
    venue_offer_model: isHostOfferModel(prefill.model) ? prefill.model : '',
    venue_offer_rate: prefill.rate > 0 ? String(prefill.rate) : '',
    offerings: offeringsToText(prefill.offerings),
    note: prefill.note,
  };
}

/**
 * The `venue_offer` input, or null until a window, a pricing option and an
 * amount are all there. A free venue needs no amount; its justification rides
 * along once the form holds a complete, accepted one (the server requires it).
 */
export function venueOfferInput(source: Readonly<VenueOfferSource>): VenueOfferInput | null {
  if (!source.start || !source.end || !isHostOfferModel(source.model)) return null;
  const free = source.model === FREE_VENUE_OFFER_MODEL;
  const rate = free ? 0 : offerRateOf(source.rate);
  if (!free && rate <= 0) return null;
  const input: VenueOfferInput = {
    start_at: source.start,
    end_at: source.end,
    space_label: bookingSpaceLabel(source.spaceLabel),
    pax: Math.max(0, Math.floor(source.pax) || 0),
    pets: source.pets,
    model: source.model,
    rate,
  };
  if (source.offerings !== undefined) input.offerings = offeringsFromText(source.offerings);
  if (source.note !== undefined) input.note = String(source.note ?? '').trim();
  const justification = free && source.freeJustification ? freeJustificationInput(source.freeJustification) : null;
  if (justification) input.free_justification = justification;
  return input;
}

/**
 * The input a live quote is asked with: everything that moves the price, none
 * of the points or the note — so typing them never asks for a new price.
 */
export function venueOfferPriceInput(input: Readonly<VenueOfferInput>): VenueOfferInput {
  const { start_at, end_at, space_label, pax, pets, model, rate } = input;
  return { start_at, end_at, space_label, pax, pets, model, rate };
}

/** The money a quote reads at each end of the guests: what the venue is paid and what the booking costs the pod. */
export interface OfferQuoteMoney {
  venue_payout: number;
  total: number;
  platform_fee: number;
}

/** A quote pair as a range, fewest guests first. `ranged` is false when both ends are the same money. */
export interface OfferQuoteRange {
  venueMin: number;
  venueMax: number;
  totalMin: number;
  totalMax: number;
  ranged: boolean;
}

/** The quote at the most guests and at the fewest (`quote_min`; left out, the same quote) as a range. */
export function offerQuoteRange(quote: Readonly<OfferQuoteMoney>, quoteMin?: Readonly<OfferQuoteMoney> | null): OfferQuoteRange {
  const low = quoteMin ?? quote;
  return {
    venueMin: low.venue_payout,
    venueMax: quote.venue_payout,
    totalMin: low.total,
    totalMax: quote.total,
    ranged: low.venue_payout !== quote.venue_payout || low.total !== quote.total,
  };
}

/** "₹3,000" or "₹3,000 – ₹10,000": one amount when both ends agree. `money` is the surface's formatter. */
export function moneyRangeText(min: number, max: number, money: (rupees: number) => string): string {
  return min === max ? money(max) : `${money(min)} – ${money(max)}`;
}

/** The venue arguments `potentialPodEarnings` takes for a priced offer. */
export interface OfferEarningsArgs {
  venue_amount: number;
  venue_commission_on_top: number;
  min_spots?: number;
  venue_amount_at_min?: number;
  venue_commission_on_top_at_min?: number;
}

/**
 * What Create Pod sends `potentialPodEarnings` for an offer: the venue's money
 * and Duncit's commission on top at the pod's spots, and — when the venue's
 * minimum is below them — the same at that minimum, so the host sees what they
 * earn at the fewest guests too. The server does every sum.
 */
export function offerEarningsArgs(
  quote: Readonly<OfferQuoteMoney>,
  quoteMin: Readonly<OfferQuoteMoney> | null | undefined,
  minGuests: number,
  spots: number
): OfferEarningsArgs {
  const args: OfferEarningsArgs = { venue_amount: quote.venue_payout, venue_commission_on_top: quote.platform_fee };
  const fewest = Math.floor(minGuests) || 0;
  if (!quoteMin || fewest <= 0 || fewest >= spots) return args;
  return {
    ...args,
    min_spots: fewest,
    venue_amount_at_min: quoteMin.venue_payout,
    venue_commission_on_top_at_min: quoteMin.platform_fee,
  };
}

/** The calendar fields the pickers read beside its days. */
export interface OfferCalendarLimits {
  buffer_minutes?: number | null;
  min_notice_minutes?: number | null;
}

/**
 * The pickers' grid for an offer: the default 30-minute step, no minimum or
 * maximum length (the host names the window, the venue answers it), and the
 * venue's own buffer and minimum notice from its calendar.
 */
export function offerPickerRules(limits: Readonly<OfferCalendarLimits> | null | undefined): BookingRules {
  return {
    model: null,
    booking_increment_minutes: 0,
    min_hours: 0,
    max_hours: 0,
    buffer_minutes: limits?.buffer_minutes ?? 0,
    min_notice_minutes: limits?.min_notice_minutes ?? 0,
  };
}

/** A `venueOfferCalendar` answer, as the pickers read it. */
export interface OfferCalendar extends OfferCalendarLimits {
  days: readonly BookingCalendarDay[];
}

/**
 * What the host may pick from a venue's offer calendar: every start time the
 * venue is open and free for (then one disabled tile on each day it closed
 * itself, so the calendar labels it), and, for a start, its end times. Empty
 * until the calendar is loaded. Both apps' hooks memoise this.
 */
export function offerCalendarPicks(
  calendar: Readonly<OfferCalendar> | null | undefined,
  timeZone: string,
  nowMs: number
): { tiles: BookingTile[]; endsFor: (startIso: string | null) => string[] } {
  if (!calendar) return { tiles: [], endsFor: () => [] };
  const rules = offerPickerRules(calendar);
  const { days } = calendar;
  return {
    tiles: [...bookingTiles(days, rules, timeZone, nowMs), ...bookingClosedTiles(days, timeZone)],
    endsFor: (startIso) => {
      if (!startIso) return [];
      const day = bookingDayOf(days, startIso, timeZone);
      return day ? bookingEndOptions(day, rules, startIso, timeZone) : [];
    },
  };
}

const BREAKDOWN_FIELDS = `
      model
      rate
      pax
      hours
      base
      rules {
        type
        label
        amount
      }
      min_spend_top_up
      cleaning_fee
      pet_fee
      gst_pct
      taxes
      platform_fee_pct
      platform_fee
      venue_payout
      total
      deposit`;

/** Create Pod's live price for an offer, at the most guests (`quote`) and the
 * fewest (`quote_min`), as an SDL string (mWeb wraps it with `gql`; the native
 * app re-declares it for its codegen). */
export const VENUE_OFFER_QUOTE_SDL = `
  query VenueOfferQuote($venue_id: ID!, $offer: VenueOfferInput!) {
    venueOfferQuote(venue_id: $venue_id, offer: $offer) {
      ok
      message
      quote {${BREAKDOWN_FIELDS}
      }
      quote_min {${BREAKDOWN_FIELDS}
      }
    }
  }
`;

/** Which days and hours the venue is open and free, at most MAX_BOOKING_CALENDAR_DAYS a call. */
export const VENUE_OFFER_CALENDAR_SDL = `
  query VenueOfferCalendar($venue_id: ID!, $from: String!, $to: String!, $space_label: String) {
    venueOfferCalendar(venue_id: $venue_id, from: $from, to: $to, space_label: $space_label) {
      buffer_minutes
      min_notice_minutes
      days {
        date
        closed_reason
        open
        close
        busy {
          start
          end
        }
        slots {
          start
          end
          price
          available
        }
      }
    }
  }
`;

const OFFER_FIELDS = `
      slot_id
      venue_id
      pod_id
      start_at
      end_at
      space_label
      model
      rate
      pax
      min_guests
      offerings
      note
      pets
      status
      round
      awaiting
      expires_at
      counters_per_side
      host_counters_used
      venue_counters_used
      free_pod${FREE_JUSTIFICATION_FIELDS}
      quote {${BREAKDOWN_FIELDS}
      }
      quote_min {${BREAKDOWN_FIELDS}
      }
      counter {
        model
        rate
        min_guests
        offerings
        note
        at
        quote {${BREAKDOWN_FIELDS}
        }
        quote_min {${BREAKDOWN_FIELDS}
        }
      }`;

/** A pod's venue offer, for its host's pending page and the venue chat's offer lines. */
export const POD_VENUE_OFFER_SDL = `
  query PodVenueOffer($pod_id: ID!) {
    podVenueOffer(pod_id: $pod_id) {${OFFER_FIELDS}
    }
  }
`;

/**
 * The host accepts the venue's counter: the booking is confirmed. `round` is
 * the round the host read — refused (OFFER_CHANGED) when the terms moved since.
 */
export const ACCEPT_VENUE_COUNTER_OFFER_SDL = `
  mutation AcceptVenueCounterOffer($pod_id: ID!, $round: Int) {
    acceptVenueCounterOffer(pod_id: $pod_id, round: $round) {${OFFER_FIELDS}
    }
  }
`;

/** The host declines the venue's counter: the hold is released. `round` as above. */
export const REJECT_VENUE_COUNTER_OFFER_SDL = `
  mutation RejectVenueCounterOffer($pod_id: ID!, $reason: String, $round: Int) {
    rejectVenueCounterOffer(pod_id: $pod_id, reason: $reason, round: $round)
  }
`;

/** The host answers the venue's counter with terms of their own; the venue answers next. `round` as above. */
export const COUNTER_VENUE_OFFER_AS_HOST_SDL = `
  mutation CounterVenueOfferAsHost($pod_id: ID!, $terms: VenueOfferTermsInput!, $note: String, $round: Int) {
    counterVenueOfferAsHost(pod_id: $pod_id, terms: $terms, note: $note, round: $round) {${OFFER_FIELDS}
    }
  }
`;

/** The host's counter-back priced before it is sent, at the most and the fewest guests. */
export const HOST_COUNTER_QUOTE_SDL = `
  query HostCounterQuote($pod_id: ID!, $terms: VenueOfferTermsInput!) {
    hostCounterQuote(pod_id: $pod_id, terms: $terms) {
      ok
      message
      quote {${BREAKDOWN_FIELDS}
      }
      quote_min {${BREAKDOWN_FIELDS}
      }
    }
  }
`;

/**
 * Whether a refused answer means "the terms changed while you were reading" —
 * the other side moved first, or the offer ran out. The surface re-reads the
 * offer and says so instead of showing a generic failure.
 */
export const isOfferChangedError = (reason: string | null | undefined): boolean => reason === 'OFFER_CHANGED';
