import { describe, expect, it } from 'vitest';

import {
  currentOfferTerms,
  venueOfferActions,
  venueOfferHistoryKey,
  venueOfferInboxModelKey,
  venueOfferInboxStatus,
  VENUE_OFFER_INBOX_MODEL_KEY,
} from '../src/venue-offer-inbox';

const quote = { total: 5900 };
const counterQuote = { total: 7080 };
const offer = { model: 'PER_GUEST', rate: 250, quote, status: 'SENT', awaiting: 'VENUE', counter: null };

describe('currentOfferTerms', () => {
  it("is the host's offer while the venue has not countered", () => {
    expect(currentOfferTerms(offer)).toEqual({ by: 'HOST', model: 'PER_GUEST', rate: 250, quote });
  });

  it("is the venue's counter once there is one", () => {
    const countered = { ...offer, status: 'COUNTERED', counter: { model: 'FLAT', rate: 6000, quote: counterQuote, note: '' } };
    expect(currentOfferTerms(countered)).toEqual({ by: 'VENUE', model: 'FLAT', rate: 6000, quote: counterQuote });
  });
});

describe('venueOfferInboxModelKey', () => {
  it('names every pricing option, with its amount line', () => {
    for (const model of ['PER_GUEST', 'PER_HOUR', 'PER_SLOT', 'FLAT'] as const) {
      expect(venueOfferInboxModelKey(model)).toBe(VENUE_OFFER_INBOX_MODEL_KEY[model]);
    }
    expect(venueOfferInboxModelKey('PER_HOUR')).toEqual({
      label: 'availability.offers.model.perHour',
      rate: 'availability.offers.rate.perHour',
    });
  });

  it('is null for an option this client does not know', () => {
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
