/**
 * Venue offers — what a host sends a venue from Create Pod, and how the
 * pickers and the pending page name it.
 */
import { describe, expect, it } from 'vitest';

import { bookingMinMinutes, bookingStepMinutes, WHOLE_VENUE_SPACE } from '../src/venue-booking';
import {
  ACCEPT_VENUE_COUNTER_OFFER_SDL,
  COUNTER_VENUE_OFFER_AS_HOST_SDL,
  HOST_COUNTER_QUOTE_SDL,
  POD_VENUE_OFFER_SDL,
  REJECT_VENUE_COUNTER_OFFER_SDL,
  VENUE_OFFER_ASK_LIMITS,
  VENUE_OFFER_CALENDAR_SDL,
  VENUE_OFFER_MODELS,
  VENUE_OFFER_MODEL_KEY,
  VENUE_OFFER_QUOTE_SDL,
  hostMayAnswerCounter,
  hostOfferActions,
  isOfferChangedError,
  isVenueOfferModel,
  moneyRangeText,
  offerCalendarPicks,
  offerEarningsArgs,
  offerGuestFloor,
  offerGuestsText,
  offerPickerRules,
  offerQuoteRange,
  offerRateOf,
  offeringsFromText,
  offeringsToText,
  venueOfferInput,
  venueOfferModelKey,
  venueOfferPrefillValues,
  venueOfferPriceInput,
  venueOfferStatusKey,
  venueOfferTermsText,
  type VenueOfferSource,
} from '../src/venue-offer';

const source = (over: Partial<VenueOfferSource> = {}): VenueOfferSource => ({
  start: '2026-11-07T07:30:00.000Z',
  end: '2026-11-07T09:30:00.000Z',
  pax: 20,
  pets: false,
  spaceLabel: 'Lawn',
  model: 'PER_GUEST',
  rate: '300',
  ...over,
});

describe('pricing options', () => {
  it('lists the four options in picker order, each with a name, an amount label and how it pays', () => {
    expect(VENUE_OFFER_MODELS).toEqual(['PER_GUEST', 'PER_HOUR', 'PER_SLOT', 'FLAT']);
    for (const model of VENUE_OFFER_MODELS) {
      expect(VENUE_OFFER_MODEL_KEY[model].label).toMatch(/^mweb\.createPod\.offer\.model\./);
      expect(VENUE_OFFER_MODEL_KEY[model].rate).toMatch(/^mweb\.createPod\.offer\.rate\./);
      expect(VENUE_OFFER_MODEL_KEY[model].help).toMatch(/^mweb\.createPod\.offer\.help\./);
    }
    expect(VENUE_OFFER_MODEL_KEY.PER_GUEST.help).toBe('mweb.createPod.offer.help.perGuest');
  });

  it('accepts only the four options, whatever enum a client passes', () => {
    expect(isVenueOfferModel('PER_HOUR')).toBe(true);
    expect(isVenueOfferModel('PER_PAX')).toBe(false);
    expect(isVenueOfferModel('')).toBe(false);
    expect(isVenueOfferModel(null)).toBe(false);
    expect(isVenueOfferModel(undefined)).toBe(false);
  });

  it('names a known option and nothing for an unknown one', () => {
    expect(venueOfferModelKey('FLAT')).toBe('mweb.createPod.offer.model.flat');
    expect(venueOfferModelKey('PER_PAX')).toBe('');
    expect(venueOfferModelKey(null)).toBe('');
  });
});

describe('venueOfferStatusKey', () => {
  it('names each offer status and nothing for an unknown or missing one', () => {
    expect(venueOfferStatusKey('SENT')).toBe('mweb.venueOffer.status.sent');
    expect(venueOfferStatusKey('COUNTERED')).toBe('mweb.venueOffer.status.countered');
    expect(venueOfferStatusKey('ACCEPTED')).toBe('mweb.venueOffer.status.accepted');
    expect(venueOfferStatusKey('DECLINED')).toBe('mweb.venueOffer.status.declined');
    expect(venueOfferStatusKey('EXPIRED')).toBe('');
    expect(venueOfferStatusKey(null)).toBe('');
    expect(venueOfferStatusKey(undefined)).toBe('');
  });
});

describe('venueOfferTermsText', () => {
  const t = (key: string, opts?: { vars?: Record<string, string | number> }) => `${key}:${opts?.vars?.amount ?? ''}`;
  const money = (rupees: number) => `₹${rupees}`;

  it("writes each side's terms with the option's unit", () => {
    expect(venueOfferTermsText('PER_GUEST', 300, t, money)).toBe('mweb.venueOffer.terms.perGuest:₹300');
    expect(venueOfferTermsText('FLAT', 5000, t, money)).toBe('mweb.venueOffer.terms.flat:₹5000');
  });

  it('falls back to the bare amount for an option this client does not know', () => {
    expect(venueOfferTermsText('PER_PAX', 300, t, money)).toBe('₹300');
    expect(venueOfferTermsText(null, 300, t, money)).toBe('₹300');
  });
});

describe('hostMayAnswerCounter', () => {
  it("is true only while the venue countered and it is the host's move", () => {
    expect(hostMayAnswerCounter({ status: 'COUNTERED', awaiting: 'HOST' })).toBe(true);
    expect(hostMayAnswerCounter({ status: 'COUNTERED', awaiting: 'VENUE' })).toBe(false);
    expect(hostMayAnswerCounter({ status: 'SENT', awaiting: 'VENUE' })).toBe(false);
    expect(hostMayAnswerCounter({ status: 'ACCEPTED', awaiting: null })).toBe(false);
    expect(hostMayAnswerCounter(null)).toBe(false);
    expect(hostMayAnswerCounter(undefined)).toBe(false);
  });
});

describe('hostOfferActions', () => {
  it("answers the venue's counter only while it waits on the host", () => {
    expect(hostOfferActions({ status: 'COUNTERED', awaiting: 'HOST' })).toEqual({ accept: true, reject: true, counter: true, sendNew: false });
    expect(hostOfferActions({ status: 'SENT', awaiting: 'VENUE' })).toEqual({ accept: false, reject: false, counter: false, sendNew: false });
    expect(hostOfferActions({ status: 'ACCEPTED', awaiting: null })).toEqual({ accept: false, reject: false, counter: false, sendNew: false });
  });

  it('sends a new offer once the last one was declined, and nothing without an offer', () => {
    expect(hostOfferActions({ status: 'DECLINED', awaiting: null })).toEqual({ accept: false, reject: false, counter: false, sendNew: true });
    expect(hostOfferActions(null)).toEqual({ accept: false, reject: false, counter: false, sendNew: false });
  });
});

describe('offerGuestsText', () => {
  const t = (key: string, opts?: { vars?: Record<string, string | number> }) => `${key}${JSON.stringify(opts?.vars ?? {})}`;

  it('reads a range while the venue is paid for fewer than the guests, else the guests alone', () => {
    expect(offerGuestsText(t, 8, 20)).toBe('availability.offers.guestRange{"min":8,"max":20}');
    expect(offerGuestsText(t, 0, 20)).toBe('availability.offers.guests{"n":20}');
    expect(offerGuestsText(t, 20, 20)).toBe('availability.offers.guests{"n":20}');
  });
});

describe('offerGuestFloor', () => {
  it("is the venue's minimum, never more than the space holds", () => {
    expect(offerGuestFloor(8, 40)).toBe(8);
    // A space smaller than the venue's minimum: the server asks for the space's capacity.
    expect(offerGuestFloor(8, 6)).toBe(6);
    // No capacity known: the minimum stands.
    expect(offerGuestFloor(8, null)).toBe(8);
    expect(offerGuestFloor(8.7, 0)).toBe(8);
  });

  it('is 0 when the venue names no minimum', () => {
    expect(offerGuestFloor(null, 40)).toBe(0);
    expect(offerGuestFloor(undefined, undefined)).toBe(0);
    expect(offerGuestFloor(-3, 10)).toBe(0);
  });
});

describe('offeringsFromText / offeringsToText', () => {
  it('reads one point per line, trimmed, without a typed bullet or blank lines', () => {
    expect(offeringsFromText('- Projector\n\n  • Snacks for 20  \n* Parking\nTable 4')).toEqual([
      'Projector',
      'Snacks for 20',
      'Parking',
      'Table 4',
    ]);
  });

  it('keeps a dash inside a point and reads nothing from an empty box', () => {
    expect(offeringsFromText('Wi-Fi - fast')).toEqual(['Wi-Fi - fast']);
    expect(offeringsFromText('')).toEqual([]);
    expect(offeringsFromText(' \n - \n')).toEqual([]);
    expect(offeringsFromText(null)).toEqual([]);
    expect(offeringsFromText(undefined)).toEqual([]);
  });

  it('writes points back one per line, so a form starts from terms already sent', () => {
    expect(offeringsToText(['Projector', 'Snacks'])).toBe('Projector\nSnacks');
    expect(offeringsFromText(offeringsToText(['Projector', 'Snacks']))).toEqual(['Projector', 'Snacks']);
    expect(offeringsToText([])).toBe('');
    expect(offeringsToText(null)).toBe('');
    expect(offeringsToText(undefined)).toBe('');
  });

  it("mirrors the server's bounds", () => {
    expect(VENUE_OFFER_ASK_LIMITS).toEqual({ offerings: 20, offeringLength: 120, note: 1000 });
  });
});

describe('offerRateOf', () => {
  it('reads a typed or numeric amount as rupees to two decimals', () => {
    expect(offerRateOf('300')).toBe(300);
    expect(offerRateOf(' 1499.999 ')).toBe(1500);
    expect(offerRateOf(250.556)).toBe(250.56);
  });

  it('is 0 for nothing, zero, a negative or a non-number', () => {
    expect(offerRateOf('')).toBe(0);
    expect(offerRateOf(null)).toBe(0);
    expect(offerRateOf(undefined)).toBe(0);
    expect(offerRateOf('0')).toBe(0);
    expect(offerRateOf(-10)).toBe(0);
    expect(offerRateOf('abc')).toBe(0);
    expect(offerRateOf(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('venueOfferInput', () => {
  it('sends the window, the guests, the option and the amount, with a named space as picked', () => {
    expect(venueOfferInput(source({ pets: true }))).toEqual({
      start_at: '2026-11-07T07:30:00.000Z',
      end_at: '2026-11-07T09:30:00.000Z',
      space_label: 'Lawn',
      pax: 20,
      pets: true,
      model: 'PER_GUEST',
      rate: 300,
    });
  });

  it('sends the whole venue as an empty space and whole, never negative, guests', () => {
    const offer = venueOfferInput(source({ spaceLabel: WHOLE_VENUE_SPACE, pax: 12.7, model: 'FLAT', rate: 5000 }));
    expect(offer).toMatchObject({ space_label: '', pax: 12, model: 'FLAT', rate: 5000 });
    expect(venueOfferInput(source({ pax: -3 }))?.pax).toBe(0);
    expect(venueOfferInput(source({ pax: Number.NaN }))?.pax).toBe(0);
  });

  it('carries the points and the note only when the form has them', () => {
    expect(venueOfferInput(source({ offerings: '- Projector\nSnacks', note: '  Quiet corner please ' }))).toMatchObject({
      offerings: ['Projector', 'Snacks'],
      note: 'Quiet corner please',
    });
    expect(venueOfferInput(source({ offerings: null, note: null }))).toMatchObject({ offerings: [], note: '' });
    const bare = venueOfferInput(source());
    expect(bare).not.toHaveProperty('offerings');
    expect(bare).not.toHaveProperty('note');
  });

  it('is null until the window, an option and an amount are all there', () => {
    expect(venueOfferInput(source({ start: null }))).toBeNull();
    expect(venueOfferInput(source({ end: null }))).toBeNull();
    expect(venueOfferInput(source({ model: null }))).toBeNull();
    expect(venueOfferInput(source({ model: 'PER_PAX' }))).toBeNull();
    expect(venueOfferInput(source({ rate: '' }))).toBeNull();
    expect(venueOfferInput(source({ rate: 0 }))).toBeNull();
  });
});

describe('venueOfferPrefillValues', () => {
  const declined = {
    model: 'PER_GUEST',
    rate: 500,
    offerings: ['Projector', 'Snacks'],
    note: 'Quiet corner',
    start_at: '2026-11-07T07:30:00.000Z',
    end_at: '2026-11-07T09:30:00.000Z',
    space_label: 'Lawn',
    pets: true,
  };

  it('starts a new offer from the declined terms, as the resubmit forms hold them', () => {
    expect(venueOfferPrefillValues(declined)).toEqual({
      offer_start: '2026-11-07T07:30:00.000Z',
      offer_end: '2026-11-07T09:30:00.000Z',
      space_label: 'Lawn',
      pets: true,
      venue_offer_model: 'PER_GUEST',
      venue_offer_rate: '500',
      offerings: 'Projector\nSnacks',
      note: 'Quiet corner',
    });
  });

  it('leaves an option this client does not know, and no amount, to be picked again', () => {
    expect(venueOfferPrefillValues({ ...declined, model: 'PER_DAY', rate: 0 })).toMatchObject({ venue_offer_model: '', venue_offer_rate: '' });
  });
});

describe('venueOfferPriceInput', () => {
  it('keeps everything that moves the price and drops the points and the note', () => {
    const full = venueOfferInput(source({ offerings: 'Projector', note: 'Hi' }));
    if (!full) throw new Error('expected an offer input');
    expect(venueOfferPriceInput(full)).toEqual({
      start_at: '2026-11-07T07:30:00.000Z',
      end_at: '2026-11-07T09:30:00.000Z',
      space_label: 'Lawn',
      pax: 20,
      pets: false,
      model: 'PER_GUEST',
      rate: 300,
    });
  });
});

describe('offerQuoteRange', () => {
  const most = { venue_payout: 10000, total: 11800, platform_fee: 1000 };
  const fewest = { venue_payout: 3000, total: 3540, platform_fee: 300 };

  it('reads the fewest guests first and says when the ends differ', () => {
    expect(offerQuoteRange(most, fewest)).toEqual({ venueMin: 3000, venueMax: 10000, totalMin: 3540, totalMax: 11800, ranged: true });
  });

  it('is one amount when there is no low-end quote, or both ends agree', () => {
    expect(offerQuoteRange(most, null)).toEqual({ venueMin: 10000, venueMax: 10000, totalMin: 11800, totalMax: 11800, ranged: false });
    expect(offerQuoteRange(most)).toMatchObject({ ranged: false });
    expect(offerQuoteRange(most, { ...most })).toMatchObject({ ranged: false });
  });

  it('is a range when only the totals differ', () => {
    expect(offerQuoteRange(most, { ...most, total: 11000 }).ranged).toBe(true);
  });
});

describe('moneyRangeText', () => {
  const money = (rupees: number) => `₹${rupees}`;

  it('writes one amount when both ends agree, else both with a dash', () => {
    expect(moneyRangeText(5000, 5000, money)).toBe('₹5000');
    expect(moneyRangeText(3000, 10000, money)).toBe('₹3000 – ₹10000');
  });
});

describe('offerEarningsArgs', () => {
  const most = { venue_payout: 10000, total: 11800, platform_fee: 1000 };
  const fewest = { venue_payout: 3000, total: 3540, platform_fee: 300 };

  it("sends the venue's money and the commission on top at the spots, and the same at the venue's minimum", () => {
    expect(offerEarningsArgs(most, fewest, 6, 20)).toEqual({
      venue_amount: 10000,
      venue_commission_on_top: 1000,
      min_spots: 6,
      venue_amount_at_min: 3000,
      venue_commission_on_top_at_min: 300,
    });
  });

  it('sends no minimum without a low-end quote, without a minimum, or when the minimum is the spots', () => {
    const atSpots = { venue_amount: 10000, venue_commission_on_top: 1000 };
    expect(offerEarningsArgs(most, null, 6, 20)).toEqual(atSpots);
    expect(offerEarningsArgs(most, undefined, 6, 20)).toEqual(atSpots);
    expect(offerEarningsArgs(most, fewest, 0, 20)).toEqual(atSpots);
    expect(offerEarningsArgs(most, fewest, Number.NaN, 20)).toEqual(atSpots);
    expect(offerEarningsArgs(most, fewest, 20, 20)).toEqual(atSpots);
    expect(offerEarningsArgs(most, fewest, 25, 20)).toEqual(atSpots);
  });
});

describe('isOfferChangedError', () => {
  it("is true only for the server's OFFER_CHANGED reason", () => {
    expect(isOfferChangedError('OFFER_CHANGED')).toBe(true);
    expect(isOfferChangedError('BELOW_VENUE_MINIMUM')).toBe(false);
    expect(isOfferChangedError(null)).toBe(false);
    expect(isOfferChangedError(undefined)).toBe(false);
  });
});

describe('offerPickerRules', () => {
  it('uses the 30-minute grid with no length limits and the venue buffer and notice', () => {
    const rules = offerPickerRules({ buffer_minutes: 15, min_notice_minutes: 120 });
    expect(rules).toEqual({
      model: null,
      booking_increment_minutes: 0,
      min_hours: 0,
      max_hours: 0,
      buffer_minutes: 15,
      min_notice_minutes: 120,
    });
    expect(bookingStepMinutes(rules)).toBe(30);
    expect(bookingMinMinutes(rules)).toBe(30);
  });

  it('keeps no buffer or notice until the calendar says otherwise', () => {
    expect(offerPickerRules(null)).toMatchObject({ buffer_minutes: 0, min_notice_minutes: 0 });
    expect(offerPickerRules({ buffer_minutes: null })).toMatchObject({ buffer_minutes: 0, min_notice_minutes: 0 });
  });
});

describe('offerCalendarPicks', () => {
  const TZ = 'Asia/Kolkata';
  const EARLY = Date.parse('2026-11-01T00:00:00.000Z');
  /** Open 09:00–13:00 IST on the 5th; a holiday on the 6th. */
  const calendar = {
    buffer_minutes: 0,
    min_notice_minutes: 0,
    days: [
      { date: '2026-11-05', open: '2026-11-05T03:30:00.000Z', close: '2026-11-05T07:30:00.000Z', busy: [], slots: [] },
      { date: '2026-11-06', closed_reason: 'HOLIDAY', busy: [], slots: [] },
    ],
  };

  it('offers every half-hour start the venue is open for, then labels the day it closed', () => {
    const { tiles } = offerCalendarPicks(calendar, TZ, EARLY);
    const starts = tiles.filter((tile) => !tile.disabled);
    expect(starts).toHaveLength(8);
    expect(starts[0]).toMatchObject({ start_at: '2026-11-05T03:30:00.000Z', end_at: null, price: null });
    expect(tiles.filter((tile) => tile.disabled)).toEqual([
      expect.objectContaining({ closed_reason: 'HOLIDAY', start_at: '2026-11-05T18:30:00.000Z' }),
    ]);
  });

  it('gives a start its ends up to closing, and none without a start or outside the loaded days', () => {
    const { endsFor } = offerCalendarPicks(calendar, TZ, EARLY);
    expect(endsFor('2026-11-05T06:30:00.000Z')).toEqual(['2026-11-05T07:00:00.000Z', '2026-11-05T07:30:00.000Z']);
    expect(endsFor(null)).toEqual([]);
    expect(endsFor('2026-12-01T06:30:00.000Z')).toEqual([]);
  });

  it('offers nothing until the calendar is loaded', () => {
    const picks = offerCalendarPicks(null, TZ, EARLY);
    expect(picks.tiles).toEqual([]);
    expect(picks.endsFor('2026-11-05T06:30:00.000Z')).toEqual([]);
  });
});

describe('offer documents', () => {
  it('carries each host-side operation, asking for the full price breakdown at both ends of the guests', () => {
    expect(VENUE_OFFER_QUOTE_SDL).toContain('venueOfferQuote(venue_id: $venue_id, offer: $offer)');
    expect(VENUE_OFFER_QUOTE_SDL).toContain('platform_fee');
    expect(VENUE_OFFER_QUOTE_SDL).toContain('quote_min {');
    expect(VENUE_OFFER_CALENDAR_SDL).toContain('venueOfferCalendar(');
    expect(POD_VENUE_OFFER_SDL).toContain('podVenueOffer(pod_id: $pod_id)');
    expect(POD_VENUE_OFFER_SDL).toContain('counter {');
    for (const field of ['min_guests', 'offerings', 'note', 'expires_at', 'quote_min {']) {
      expect(POD_VENUE_OFFER_SDL).toContain(field);
    }
  });

  it('answers with the round the host read, so a move made meanwhile is refused instead of overwritten', () => {
    expect(ACCEPT_VENUE_COUNTER_OFFER_SDL).toContain('acceptVenueCounterOffer(pod_id: $pod_id, round: $round)');
    expect(REJECT_VENUE_COUNTER_OFFER_SDL).toContain('rejectVenueCounterOffer(pod_id: $pod_id, reason: $reason, round: $round)');
    expect(COUNTER_VENUE_OFFER_AS_HOST_SDL).toContain(
      'counterVenueOfferAsHost(pod_id: $pod_id, terms: $terms, note: $note, round: $round)'
    );
    expect(HOST_COUNTER_QUOTE_SDL).toContain('hostCounterQuote(pod_id: $pod_id, terms: $terms)');
    expect(HOST_COUNTER_QUOTE_SDL).toContain('quote_min {');
  });
});
