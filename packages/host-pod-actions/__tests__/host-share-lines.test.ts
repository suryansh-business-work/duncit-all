import { describe, expect, it } from 'vitest';

import { buildHostShareLines } from '../src/pod-complete/host-share-lines';
import type { PodSettlement } from '../src/types';

const waterfall = {
  version: 1,
  amount: 1000,
  gst_pct: 18,
  gst_amount: 180,
  net_amount: 820,
  platform_fee_pct: 10,
  platform_fee_amount: 82,
  pool_amount: 738,
  venue_amount: 300,
  venue_commission_pct: 5,
  venue_commission_amount: 15,
  venue_receives: 285,
  host_amount: 438,
  host_commission_pct: 0,
  host_commission_amount: 0,
  host_receives: 400,
  duncit_revenue: 197,
  host_earn_pct: 40,
};

const settlement = (has_venue: boolean): PodSettlement =>
  ({
    currency_symbol: '₹',
    collected_total: 1200,
    has_venue,
    paying_attendees: 8,
    attended_seats: 8,
    booked_seats: 10,
    attended_total: 1000,
    attendees: [],
    waterfall,
  }) as PodSettlement;

const keys = (has_venue: boolean) => buildHostShareLines(settlement(has_venue)).map((l) => l.key);

describe('buildHostShareLines', () => {
  it('opens on the settlement basis — the money from the seats that were scanned in', () => {
    const [first] = buildHostShareLines(settlement(false));

    expect(first).toEqual({ key: 'paid', label: 'Customer Paid', value: 1000 });
    // NOT collected_total: folding in seats nobody scanned would make every
    // line below fail to add up.
    expect(first?.value).not.toBe(1200);
  });

  it('runs the waterfall in the order a host reads it', () => {
    expect(keys(false)).toEqual(['paid', 'gst', 'fee', 'pool', 'host', 'duncit']);
  });

  it('spells the percentages into the deduction labels', () => {
    const byKey = new Map(buildHostShareLines(settlement(false)).map((l) => [l.key, l]));

    expect(byKey.get('gst')?.label).toBe('− GST (18%)');
    expect(byKey.get('fee')?.label).toBe('− Platform Fee (10%)');
  });

  it('says "You receive", not "Host receives" — this is the host’s own screen', () => {
    const host = buildHostShareLines(settlement(false)).find((l) => l.key === 'host');

    expect(host).toEqual({ key: 'host', label: 'You receive', value: 400, strong: true });
  });

  it('adds the venue lines only for a pod that has a venue', () => {
    expect(keys(true)).toEqual(['paid', 'gst', 'fee', 'pool', 'venue', 'venue-receives', 'host', 'duncit']);
    expect(buildHostShareLines(settlement(true)).find((l) => l.key === 'venue')?.value).toBe(300);
    expect(buildHostShareLines(settlement(true)).find((l) => l.key === 'venue-receives')?.value).toBe(285);
  });

  it('closes on what Duncit keeps', () => {
    expect(buildHostShareLines(settlement(true)).at(-1)).toEqual({
      key: 'duncit',
      label: 'Duncit revenue',
      value: 197,
    });
  });

  it('gives every line a distinct key, because they are rendered as a list', () => {
    const all = keys(true);

    expect(new Set(all).size).toBe(all.length);
  });
});
