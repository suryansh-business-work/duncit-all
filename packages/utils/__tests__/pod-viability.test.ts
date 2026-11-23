/**
 * Whether a paid pod's submit may be enabled, and what the author is told when
 * the server's verdict says it would be refused.
 */
import { describe, expect, it } from 'vitest';

import {
  MWEB_POD_VIABILITY_KEYS,
  POD_VIABILITY_REASONS,
  paidPodSubmitBlocked,
  podViabilityNotice,
  podViabilityReasonOf,
  type PodViabilityCopyKeys,
} from '../src/pod-viability';

/** Echoes the key and its vars, so a test reads exactly which copy was picked. */
const t = (key: string, opts?: { vars?: Record<string, string | number> }) =>
  opts?.vars ? `${key} ${JSON.stringify(opts.vars)}` : key;
const money = (rupees: number) => `₹${rupees.toFixed(2)}`;

const KEYS: PodViabilityCopyKeys = {
  title: { BELOW_MIN_BUSINESS: 'below.title', VENUE_NOT_COVERED: 'venue.title', NO_EARNINGS: 'none.title' },
  withPrice: { BELOW_MIN_BUSINESS: 'below.price', VENUE_NOT_COVERED: 'venue.price', NO_EARNINGS: 'none.price' },
  withoutPrice: { BELOW_MIN_BUSINESS: 'below.plain', VENUE_NOT_COVERED: 'venue.plain', NO_EARNINGS: 'none.plain' },
};

describe('paidPodSubmitBlocked', () => {
  it('never holds back a free pod, whatever the projection says', () => {
    expect(paidPodSubmitBlocked(true, false, null)).toBe(false);
    expect(paidPodSubmitBlocked(true, true, { viable: false })).toBe(false);
  });

  it('holds a paid pod until a fresh projection says viable', () => {
    expect(paidPodSubmitBlocked(false, true, { viable: true })).toBe(false);
    expect(paidPodSubmitBlocked(false, true, { viable: false })).toBe(true);
  });

  it('holds a paid pod while the projection is loading, stale or failed — a viable answer for other inputs does not count', () => {
    expect(paidPodSubmitBlocked(false, false, { viable: true })).toBe(true);
    expect(paidPodSubmitBlocked(false, false, null)).toBe(true);
  });

  it('holds a paid pod with no projection at all', () => {
    expect(paidPodSubmitBlocked(false, true, null)).toBe(true);
    expect(paidPodSubmitBlocked(false, true, undefined)).toBe(true);
  });
});

describe('podViabilityReasonOf', () => {
  it('keeps every reason the server sends, in the order a host fixes them', () => {
    expect(POD_VIABILITY_REASONS).toEqual(['BELOW_MIN_BUSINESS', 'VENUE_NOT_COVERED', 'NO_EARNINGS']);
    for (const reason of POD_VIABILITY_REASONS) expect(podViabilityReasonOf(reason)).toBe(reason);
  });

  it('reads a reason a newer server adds, or none, as NO_EARNINGS — still refused, still told to raise the price', () => {
    expect(podViabilityReasonOf('SOMETHING_NEW')).toBe('NO_EARNINGS');
    expect(podViabilityReasonOf(null)).toBe('NO_EARNINGS');
    expect(podViabilityReasonOf(undefined)).toBe('NO_EARNINGS');
  });
});

describe('podViabilityNotice', () => {
  it('says nothing for a viable projection, or for none', () => {
    expect(podViabilityNotice({ viable: true, viability_reason: null }, KEYS, t, money)).toBeNull();
    expect(podViabilityNotice(null, KEYS, t, money)).toBeNull();
    expect(podViabilityNotice(undefined, KEYS, t, money)).toBeNull();
  });

  it("names the venue's minimum business and the lowest ticket price that works", () => {
    const notice = podViabilityNotice(
      { viable: false, viability_reason: 'BELOW_MIN_BUSINESS', minimum_viable_ticket_price: 93, venue_min_business: 1000 },
      KEYS,
      t,
      money
    );
    expect(notice).toEqual({
      reason: 'BELOW_MIN_BUSINESS',
      title: 'below.title',
      body: 'below.price {"minimum":"₹1000.00","price":"₹93.00"}',
    });
  });

  it('names the lowest working price for the other reasons too', () => {
    const venue = podViabilityNotice({ viable: false, viability_reason: 'VENUE_NOT_COVERED', minimum_viable_ticket_price: 450 }, KEYS, t, money);
    expect(venue?.title).toBe('venue.title');
    expect(venue?.body).toBe('venue.price {"minimum":"₹0.00","price":"₹450.00"}');
    const none = podViabilityNotice({ viable: false, viability_reason: 'NO_EARNINGS', minimum_viable_ticket_price: 120, venue_min_business: 0 }, KEYS, t, money);
    expect(none?.body).toBe('none.price {"minimum":"₹0.00","price":"₹120.00"}');
  });

  it('falls back to the price-less copy when no ticket price up to the cap works', () => {
    const noPrice = { viable: false, viability_reason: 'BELOW_MIN_BUSINESS', venue_min_business: 50000 };
    expect(podViabilityNotice({ ...noPrice, minimum_viable_ticket_price: null }, KEYS, t, money)?.body).toBe(
      'below.plain {"minimum":"₹50000.00","price":""}'
    );
    expect(podViabilityNotice(noPrice, KEYS, t, money)?.body).toBe('below.plain {"minimum":"₹50000.00","price":""}');
    expect(podViabilityNotice({ ...noPrice, minimum_viable_ticket_price: 0 }, KEYS, t, money)?.body).toMatch(/^below\.plain/);
    expect(podViabilityNotice({ ...noPrice, minimum_viable_ticket_price: Number.NaN }, KEYS, t, money)?.body).toMatch(/^below\.plain/);
  });

  it('words an unknown reason as a ₹0 payout', () => {
    const notice = podViabilityNotice({ viable: false, viability_reason: 'SOMETHING_NEW' }, KEYS, t, money);
    expect(notice?.reason).toBe('NO_EARNINGS');
    expect(notice?.title).toBe('none.title');
    expect(notice?.body).toBe('none.plain {"minimum":"₹0.00","price":""}');
  });
});

describe('MWEB_POD_VIABILITY_KEYS', () => {
  it('words every reason with the shared mWeb + app bundle, reusing the ₹0 and venue copy when no price works', () => {
    for (const reason of POD_VIABILITY_REASONS) {
      expect(MWEB_POD_VIABILITY_KEYS.title[reason]).toMatch(/^mweb\.createPod\./);
      expect(MWEB_POD_VIABILITY_KEYS.withPrice[reason]).toMatch(/^mweb\.createPod\.viability\./);
      expect(MWEB_POD_VIABILITY_KEYS.withoutPrice[reason]).toMatch(/^mweb\.createPod\./);
    }
    expect(MWEB_POD_VIABILITY_KEYS.title.NO_EARNINGS).toBe('mweb.createPod.zeroEarningsTitle');
    expect(MWEB_POD_VIABILITY_KEYS.withoutPrice.NO_EARNINGS).toBe('mweb.createPod.zeroEarningsBody');
    expect(MWEB_POD_VIABILITY_KEYS.withoutPrice.VENUE_NOT_COVERED).toBe('mweb.createPod.venueShortfall');
  });
});
