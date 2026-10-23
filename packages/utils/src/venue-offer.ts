/**
 * Venue offers — the host side of booking a venue, shared by mWeb, the native
 * app and the Partners pod form (rules 29 + 56).
 *
 * The host picks a window the venue is open and free, the guests, and how they
 * will pay the venue (per guest, per hour, for the slot, or a flat price) with
 * an amount. The server prices that offer with the venue's own charges (price
 * rules, fees, minimum spend, GST) and Duncit's commission on top
 * (`venueOfferQuote`); the venue then accepts, rejects or counters it. This
 * module never prices anything: it builds the input, names the choices, and
 * carries the operations as SDL strings.
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

/** How the host offers to pay the venue (`VenueOfferModel`). */
export type VenueOfferModel = 'PER_GUEST' | 'PER_HOUR' | 'PER_SLOT' | 'FLAT';

/** The pricing options, in the order the pickers list them. */
export const VENUE_OFFER_MODELS: readonly VenueOfferModel[] = ['PER_GUEST', 'PER_HOUR', 'PER_SLOT', 'FLAT'];

/** Each pricing option's name, and the label of its amount field. */
export const VENUE_OFFER_MODEL_KEY: Readonly<Record<VenueOfferModel, { label: string; rate: string }>> = {
  PER_GUEST: { label: 'mweb.createPod.offer.model.perGuest', rate: 'mweb.createPod.offer.rate.perGuest' },
  PER_HOUR: { label: 'mweb.createPod.offer.model.perHour', rate: 'mweb.createPod.offer.rate.perHour' },
  PER_SLOT: { label: 'mweb.createPod.offer.model.perSlot', rate: 'mweb.createPod.offer.rate.perSlot' },
  FLAT: { label: 'mweb.createPod.offer.model.flat', rate: 'mweb.createPod.offer.rate.flat' },
};

/** Whether a plain string (either app's generated enum value) is a pricing option. */
export const isVenueOfferModel = (model: string | null | undefined): model is VenueOfferModel =>
  !!model && (VENUE_OFFER_MODELS as readonly string[]).includes(model);

/** The option's name key, or '' for one this client does not know. */
export const venueOfferModelKey = (model: string | null | undefined): string =>
  isVenueOfferModel(model) ? VENUE_OFFER_MODEL_KEY[model].label : '';

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
  PER_SLOT: 'mweb.venueOffer.terms.perSlot',
  FLAT: 'mweb.venueOffer.terms.flat',
};

/** The `t` either app passes in. */
type OfferTranslate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

/** One side's terms as a line ("₹300 per guest"), or just the money for an unknown option. */
export function venueOfferTermsText(
  model: string | null | undefined,
  rate: number,
  t: OfferTranslate,
  money: (rupees: number) => string
): string {
  const amount = money(rate);
  return isVenueOfferModel(model) ? t(VENUE_OFFER_TERMS_KEY[model], { vars: { amount } }) : amount;
}

/** Whether the host now has the venue's counter to accept or reject. */
export const hostMayAnswerCounter = (offer: { status?: string | null; awaiting?: string | null } | null | undefined): boolean =>
  offer?.status === 'COUNTERED' && offer.awaiting === 'HOST';

/** What a pod sends as `venue_offer` (VenueOfferInput). */
export interface VenueOfferInput {
  start_at: string;
  end_at: string;
  space_label: string;
  pax: number;
  pets: boolean;
  model: VenueOfferModel;
  rate: number;
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
}

/** The typed amount as rupees: a positive finite number, else 0 (nothing offered). */
export function offerRateOf(rate: string | number | null | undefined): number {
  const value = typeof rate === 'number' ? rate : Number(String(rate ?? '').trim());
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

/** The `venue_offer` input, or null until a window, a pricing option and an amount are all there. */
export function venueOfferInput(source: Readonly<VenueOfferSource>): VenueOfferInput | null {
  const rate = offerRateOf(source.rate);
  if (!source.start || !source.end || !isVenueOfferModel(source.model) || rate <= 0) return null;
  return {
    start_at: source.start,
    end_at: source.end,
    space_label: bookingSpaceLabel(source.spaceLabel),
    pax: Math.max(0, Math.floor(source.pax) || 0),
    pets: source.pets,
    model: source.model,
    rate,
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

/** Create Pod's live price for an offer, as an SDL string (mWeb wraps it with
 * `gql`; the native app re-declares it for its codegen). */
export const VENUE_OFFER_QUOTE_SDL = `
  query VenueOfferQuote($venue_id: ID!, $offer: VenueOfferInput!) {
    venueOfferQuote(venue_id: $venue_id, offer: $offer) {
      ok
      message
      quote {${BREAKDOWN_FIELDS}
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
      pets
      status
      round
      awaiting
      quote {${BREAKDOWN_FIELDS}
      }
      counter {
        model
        rate
        note
        at
        quote {${BREAKDOWN_FIELDS}
        }
      }`;

/** A pod's venue offer, for its host's pending page. */
export const POD_VENUE_OFFER_SDL = `
  query PodVenueOffer($pod_id: ID!) {
    podVenueOffer(pod_id: $pod_id) {${OFFER_FIELDS}
    }
  }
`;

/** The host accepts the venue's counter: the booking is confirmed. */
export const ACCEPT_VENUE_COUNTER_OFFER_SDL = `
  mutation AcceptVenueCounterOffer($pod_id: ID!) {
    acceptVenueCounterOffer(pod_id: $pod_id) {${OFFER_FIELDS}
    }
  }
`;

/** The host declines the venue's counter: the hold is released. */
export const REJECT_VENUE_COUNTER_OFFER_SDL = `
  mutation RejectVenueCounterOffer($pod_id: ID!, $reason: String) {
    rejectVenueCounterOffer(pod_id: $pod_id, reason: $reason)
  }
`;
