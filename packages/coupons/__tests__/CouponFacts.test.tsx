/**
 * The detail page's facts panel: four tiles, then the rules the code is
 * enforced by.
 *
 * Three coupons are rendered because the panel's whole job is saying what a
 * field means when it is EMPTY — an uncapped code, a code nobody has redeemed
 * and a pod code whose pod document is gone each read differently from a
 * blank, and a blank is what they used to render as.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EM_DASH } from '@duncit/table';

import CouponFacts from '../src/detail/CouponFacts';
import type { CouponRow, CouponStats } from '../src/queries';

/** Deterministic stand-in for the admin-configured formatter. */
const formatDateTime = (value: Date | string) => `at ${String(value).slice(0, 10)}`;

const coupon = (over: Partial<CouponRow> = {}): CouponRow =>
  ({
    id: 'c-1',
    code: 'SUMMER25',
    description: 'Summer sale',
    discount_pct: 25,
    scope: 'GLOBAL',
    pod_id: null,
    pod: null,
    valid_from: '2026-08-01T12:00:00.000Z',
    valid_until: '2026-08-31T12:00:00.000Z',
    max_uses: 100,
    per_user_limit: 1,
    min_order_amount: 500,
    used_count: 7,
    is_active: true,
    created_at: '2026-08-01T12:00:00.000Z',
    updated_at: '2026-08-02T12:00:00.000Z',
    ...over,
  }) as CouponRow;

const stats = (over: Partial<CouponStats> = {}): CouponStats => ({
  used_count: 7,
  unique_users: 6,
  total_discount: 4300,
  order_value: 28000,
  remaining_uses: 93,
  last_redeemed_at: '2026-08-14T12:00:00.000Z',
  currency_symbol: '₹',
  ...over,
});

const mount = (c: CouponRow, s: CouponStats) =>
  render(<CouponFacts coupon={c} stats={s} formatDateTime={formatDateTime} />);

describe('CouponFacts', () => {
  it('states a capped, live, pod-scoped code and what it has taken off orders', () => {
    mount(
      coupon({
        scope: 'POD',
        pod_id: 'pod-1',
        pod: { id: 'pod-1', pod_title: 'Sunday Badminton' },
      }),
      stats()
    );

    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('93 left')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('₹4,300')).toBeInTheDocument();
    expect(screen.getByText('Order value ₹28,000')).toBeInTheDocument();

    expect(screen.getByText('Sunday Badminton')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('at 2026-08-01 → at 2026-08-31')).toBeInTheDocument();
    expect(screen.getByText('7 of 100')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('₹500')).toBeInTheDocument();
    expect(screen.getByText('at 2026-08-14')).toBeInTheDocument();
    expect(screen.getByText('Summer sale')).toBeInTheDocument();
  });

  it('names every open-ended rule rather than leaving its value blank', () => {
    mount(
      coupon({
        description: '',
        is_active: false,
        max_uses: null,
        per_user_limit: null,
        min_order_amount: 0,
        valid_from: null,
        valid_until: null,
      }),
      stats({ last_redeemed_at: null, remaining_uses: null })
    );

    expect(screen.getByText('No usage cap')).toBeInTheDocument();
    expect(screen.getByText('Global (all pods)')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText(`${EM_DASH} → ${EM_DASH}`)).toBeInTheDocument();
    expect(screen.getAllByText('No limit')).toHaveLength(2);
    expect(screen.getByText('No minimum')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    // Description is the one field with no copy of its own to fall back to.
    expect(screen.getAllByText(EM_DASH).length).toBeGreaterThan(0);
  });

  it('counts the last redemption of a capped code whose remaining uses are unknown', () => {
    mount(
      coupon({ scope: 'POD', pod_id: 'pod-gone', pod: null, max_uses: 40 }),
      stats({ remaining_uses: null })
    );

    expect(screen.getByText('0 left')).toBeInTheDocument();
    expect(screen.getByText('7 of 40')).toBeInTheDocument();
    // A pod-scoped code whose pod was deleted says so rather than reading global.
    expect(screen.queryByText('Global (all pods)')).toBeNull();
  });
});
