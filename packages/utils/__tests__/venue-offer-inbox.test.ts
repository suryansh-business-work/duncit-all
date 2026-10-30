import { describe, expect, it } from 'vitest';

import {
  currentOfferTerms,
  isCounterLimitError,
  offerCounterAllowance,
  venueOfferActions,
  venueOfferPin,
  venueOfferHistoryKey,
  venueOfferInboxModelKey,
  venueOfferInboxStatus,
  venueOfferTermsLine,
  FREE_VENUE_INBOX_KEY,
  VENUE_OFFER_INBOX_MODEL_KEY,
} from '../src/venue-offer-inbox';

const quote = { total: 5900 };
const counterQuote = { total: 7080 };
const offer = { model: 'PER_GUEST', rate: 250, quote, status: 'SENT', awaiting: 'VENUE', counter: null };

describe('currentOfferTerms', () => {
  it("is the host's offer while the venue has not countered — priced the same at both ends when it carries no minimum", () => {
    expect(currentOfferTerms(offer)).toEqual({
      by: 'HOST',
      model: 'PER_GUEST',
      rate: 250,
      quote,
      quoteMin: quote,
      minGuests: 0,
      offerings: [],
      note: '',
    });
  });

  it("carries the host's minimum, points, note and low-end quote", () => {
    const quoteMin = { total: 1770 };
    const asked = { ...offer, min_guests: 6, offerings: ['Projector'], note: 'Quiet corner', quote_min: quoteMin };
    expect(currentOfferTerms(asked)).toMatchObject({ by: 'HOST', minGuests: 6, offerings: ['Projector'], note: 'Quiet corner', quoteMin });
  });

  it("is the venue's counter once there is one, with its own note and minimum", () => {
    const counterMin = { total: 3540 };
    const countered = {
      ...offer,
      status: 'COUNTERED',
      counter: { model: 'FLAT', rate: 6000, quote: counterQuote, note: 'Includes DJ', min_guests: 10, offerings: ['DJ'], quote_min: counterMin },
    };
    expect(currentOfferTerms(countered)).toEqual({
      by: 'VENUE',
      model: 'FLAT',
      rate: 6000,
      quote: counterQuote,
      quoteMin: counterMin,
      minGuests: 10,
      offerings: ['DJ'],
      note: 'Includes DJ',
    });
  });

  it("reads a counter from an older server, which carries only the money, as the venue's terms", () => {
    const older = { ...offer, status: 'COUNTERED', counter: { model: 'FLAT', rate: 6000, quote: counterQuote, note: null } };
    expect(currentOfferTerms(older)).toMatchObject({ by: 'VENUE', quoteMin: counterQuote, minGuests: 0, offerings: [], note: '' });
  });
});

describe('venueOfferTermsLine', () => {
  // A translator over the two words a line is made of, filling `{name}` as @duncit/i18n does.
  const copy: Record<string, string> = {
    'availability.offers.termsLine': '{model} · {rate}',
    'availability.offers.model.perGuest': 'Per guest',
    'availability.offers.rate.perGuest': '{rate} per guest',
  };
  const t = (key: string, opts?: { vars?: Record<string, string | number> }) =>
    (copy[key] ?? key).replaceAll(/\{(\w+)\}/g, (match, name: string) => String(opts?.vars?.[name] ?? match));

  it("writes one side's terms as the option and its amount line, with the amount as the surface wrote it", () => {
    expect(venueOfferTermsLine(t, 'PER_GUEST', '₹300.00')).toBe('Per guest · ₹300.00 per guest');
  });

  it('is just the amount for an option this client does not know', () => {
    expect(venueOfferTermsLine(t, 'PER_DAY', '₹300.00')).toBe('₹300.00');
    expect(venueOfferTermsLine(t, null, '₹300.00')).toBe('₹300.00');
  });

  it('names a free venue without any amount', () => {
    expect(venueOfferTermsLine(t, 'FREE', '₹0.00')).toBe(FREE_VENUE_INBOX_KEY);
    expect(FREE_VENUE_INBOX_KEY).toBe('availability.offers.model.free');
    expect(venueOfferInboxModelKey('FREE')).toBeNull();
  });
});

describe('venueOfferInboxModelKey', () => {
  it('names every pricing option, with its amount line', () => {
    expect(Object.keys(VENUE_OFFER_INBOX_MODEL_KEY)).toEqual(['PER_GUEST', 'PER_HOUR', 'FLAT']);
    for (const model of ['PER_GUEST', 'PER_HOUR', 'FLAT'] as const) {
      expect(venueOfferInboxModelKey(model)).toBe(VENUE_OFFER_INBOX_MODEL_KEY[model]);
    }
    expect(venueOfferInboxModelKey('PER_HOUR')).toEqual({
      label: 'availability.offers.model.perHour',
      rate: 'availability.offers.rate.perHour',
    });
  });

  it('is null for an option this client does not know, the retired per-slot one included', () => {
    expect(venueOfferInboxModelKey('PER_SLOT')).toBeNull();
    expect(venueOfferInboxModelKey('PER_DAY')).toBeNull();
    expect(venueOfferInboxModelKey(null)).toBeNull();
    expect(venueOfferInboxModelKey(undefined)).toBeNull();
  });
});

describe('venueOfferInboxStatus', () => {
  it("tells the venue where each request stands", () => {
    expect(venueOfferInboxStatus({ status: 'SENT' })).toEqual({ key: 'availability.offers.status.yourMove', tone: 'warning' });
    expect(venueOfferInboxStatus({ status: 'COUNTERED' })).toEqual({ key: 'availability.offers.status.countered', tone: 'info' });
    expect(venueOfferInboxStatus({ status: 'ACCEPTED' })).toEqual({ key: 'availability.offers.status.accepted', tone: 'success' });
    expect(venueOfferInboxStatus({ status: 'DECLINED' })).toEqual({ key: 'availability.offers.status.declined', tone: 'error' });
  });

  it('says nothing about a status this client does not know', () => {
    expect(venueOfferInboxStatus({ status: 'EXPIRED' })).toEqual({ key: '', tone: 'info' });
  });
});

describe('venueOfferActions', () => {
  it('offers accept, reject and counter on a fresh offer', () => {
    expect(venueOfferActions({ status: 'SENT' })).toEqual({ accept: true, reject: true, counter: true });
  });

  it('lets the venue change or withdraw its counter, but not accept its own terms', () => {
    expect(venueOfferActions({ status: 'COUNTERED' })).toEqual({ accept: false, reject: true, counter: true });
  });

  it('closes every action once the offer is settled', () => {
    for (const status of ['ACCEPTED', 'DECLINED', 'UNKNOWN']) {
      expect(venueOfferActions({ status })).toEqual({ accept: false, reject: false, counter: false });
    }
  });

  it('stops the venue countering once its own share is used, leaving accept and reject', () => {
    const usedUp = { counters_per_side: 2, venue_counters_used: 2, host_counters_used: 0 };
    expect(venueOfferActions({ status: 'SENT', ...usedUp })).toEqual({ accept: true, reject: true, counter: false });
    expect(venueOfferActions({ status: 'COUNTERED', ...usedUp })).toEqual({ accept: false, reject: true, counter: false });
  });

  it("keeps the venue's counter while it has one left, however many the host used", () => {
    expect(venueOfferActions({ status: 'SENT', counters_per_side: 2, venue_counters_used: 1, host_counters_used: 2 })).toEqual({
      accept: true,
      reject: true,
      counter: true,
    });
  });
});

describe('offerCounterAllowance', () => {
  const usage = { counters_per_side: 3, host_counters_used: 1, venue_counters_used: 3 };

  it("names one side's counters left of its share", () => {
    expect(offerCounterAllowance(usage, 'HOST')).toEqual({ left: 2, of: 3 });
    expect(offerCounterAllowance(usage, 'VENUE')).toEqual({ left: 0, of: 3 });
    expect(offerCounterAllowance({ counters_per_side: 1 }, 'VENUE')).toEqual({ left: 1, of: 1 });
  });

  it('is null when the server names no limit', () => {
    expect(offerCounterAllowance({}, 'HOST')).toBeNull();
    expect(offerCounterAllowance({ counters_per_side: null, venue_counters_used: 2 }, 'VENUE')).toBeNull();
  });

  it('is null on a booking that takes no counters at all — a free one has no share to count down', () => {
    expect(offerCounterAllowance({ counters_per_side: 0 }, 'HOST')).toBeNull();
    expect(offerCounterAllowance({ counters_per_side: 0, venue_counters_used: 0 }, 'VENUE')).toBeNull();
  });
});

describe('venueOfferPin', () => {
  const live = {
    status: 'COUNTERED',
    awaiting: 'HOST',
    expires_at: '2026-11-06T07:30:00.000Z',
    counters_per_side: 3,
    host_counters_used: 1,
    venue_counters_used: 2,
  };

  it("tells the side the offer waits on that it is their move, with each side's counters and the deadline", () => {
    expect(venueOfferPin(live, 'HOST')).toEqual({
      statusKey: 'availability.offers.pin.yourMove',
      open: true,
      mine: { left: 2, of: 3 },
      theirs: { left: 1, of: 3 },
      expiresAt: '2026-11-06T07:30:00.000Z',
    });
  });

  it('tells the other side it is waiting on them, with the counters read from its own end', () => {
    expect(venueOfferPin(live, 'VENUE')).toEqual({
      statusKey: 'availability.offers.pin.theirMove',
      open: true,
      mine: { left: 1, of: 3 },
      theirs: { left: 2, of: 3 },
      expiresAt: '2026-11-06T07:30:00.000Z',
    });
    expect(venueOfferPin({ ...live, status: 'SENT', awaiting: 'VENUE' }, 'VENUE')).toMatchObject({
      statusKey: 'availability.offers.pin.yourMove',
      open: true,
    });
  });

  it('names an accepted or declined offer as closed, with no deadline', () => {
    expect(venueOfferPin({ ...live, status: 'ACCEPTED', awaiting: null }, 'HOST')).toEqual({
      statusKey: 'availability.offers.pin.accepted',
      open: false,
      mine: { left: 2, of: 3 },
      theirs: { left: 1, of: 3 },
      expiresAt: null,
    });
    expect(venueOfferPin({ ...live, status: 'DECLINED', awaiting: null }, 'VENUE')).toMatchObject({
      statusKey: 'availability.offers.pin.declined',
      open: false,
      expiresAt: null,
    });
  });

  it('says nothing about a status this client does not know, and reads it as closed', () => {
    expect(venueOfferPin({ ...live, status: 'EXPIRED' }, 'HOST')).toMatchObject({ statusKey: '', open: false, expiresAt: null });
  });

  it('carries no deadline or counters when the server sends none (older servers)', () => {
    expect(venueOfferPin({ status: 'SENT', awaiting: 'VENUE' }, 'VENUE')).toEqual({
      statusKey: 'availability.offers.pin.yourMove',
      open: true,
      mine: null,
      theirs: null,
      expiresAt: null,
    });
  });

  it('pins nothing when the pod has no live offer', () => {
    expect(venueOfferPin(null, 'HOST')).toBeNull();
    expect(venueOfferPin(undefined, 'VENUE')).toBeNull();
  });
});

describe('isCounterLimitError', () => {
  it("is true only for the server's COUNTER_LIMIT reason", () => {
    expect(isCounterLimitError('COUNTER_LIMIT')).toBe(true);
    expect(isCounterLimitError('OFFER_CHANGED')).toBe(false);
    expect(isCounterLimitError('')).toBe(false);
    expect(isCounterLimitError(null)).toBe(false);
    expect(isCounterLimitError(undefined)).toBe(false);
  });
});

describe('venueOfferHistoryKey', () => {
  it('names each negotiation step by who took it', () => {
    expect(venueOfferHistoryKey({ by: 'HOST', action: 'OFFER' })).toBe('availability.offers.history.hostOffer');
    expect(venueOfferHistoryKey({ by: 'HOST', action: 'COUNTER' })).toBe('availability.offers.history.hostCounter');
    expect(venueOfferHistoryKey({ by: 'HOST', action: 'ACCEPT' })).toBe('availability.offers.history.hostAccept');
    expect(venueOfferHistoryKey({ by: 'HOST', action: 'REJECT' })).toBe('availability.offers.history.hostReject');
    expect(venueOfferHistoryKey({ by: 'VENUE', action: 'OFFER' })).toBe('availability.offers.history.venueCounter');
    expect(venueOfferHistoryKey({ by: 'VENUE', action: 'COUNTER' })).toBe('availability.offers.history.venueCounter');
    expect(venueOfferHistoryKey({ by: 'VENUE', action: 'ACCEPT' })).toBe('availability.offers.history.venueAccept');
    expect(venueOfferHistoryKey({ by: 'VENUE', action: 'REJECT' })).toBe('availability.offers.history.venueReject');
  });

  it("is '' for a step this client does not know", () => {
    expect(venueOfferHistoryKey({ by: 'STAFF', action: 'OFFER' })).toBe('');
  });
});
