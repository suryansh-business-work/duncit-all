import '../../../__tests__/helpers/agGridEnv';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, configure, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../__tests__/render';
import VenueEarningsPage from './VenueEarningsPage';
import { payableOf, VENUE_EARNINGS, type VenuePayout } from './queries';

configure({ asyncUtilTimeout: 5000 });
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const summary = {
  __typename: 'EarningsSummary',
  currency_symbol: '₹',
  lifetime_earnings: 12500,
  pending_amount: 900.5,
  pods_completed: 7,
  this_month_earnings: 3000,
};

const payout = (over: Partial<VenuePayout> = {}) => ({
  __typename: 'PaymentReleaseRequest',
  id: 'pay-1',
  pod_title: 'Sunrise Yoga',
  status: 'APPROVED',
  amount_requested: 1000,
  approved_amount: 950,
  created_at: '2026-07-01T10:00:00.000Z',
  breakdown: null,
  ...over,
});

const earningsMock = (data: Record<string, unknown>): MockedResponse => ({
  request: { query: VENUE_EARNINGS, variables: {} },
  result: { data },
});

describe('payableOf', () => {
  it('pays the approved amount, else the v2 payout, else what was requested', () => {
    expect(payableOf(payout())).toBe(950);
    const breakdown = { version: 2, share_amount: 1000, commission_pct: 10, commission_amount: 100, payout_amount: 900 };
    expect(payableOf(payout({ approved_amount: null, breakdown }))).toBe(900);
    expect(payableOf(payout({ approved_amount: null }))).toBe(1000);
    // An approved zero is a real answer, not a missing one.
    expect(payableOf(payout({ approved_amount: 0, breakdown }))).toBe(0);
  });
});

describe('VenueEarningsPage', () => {
  it('shows the four totals and the payout history', async () => {
    renderWithProviders(<VenueEarningsPage />, {
      mocks: [earningsMock({ myVenueEarningsSummary: summary, myVenuePayouts: [payout()] })],
    });

    expect(await screen.findByTestId('venue-earnings-stats')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Venue Earnings' })).toBeTruthy();
    expect(screen.getByTestId('venue-earnings-lifetime').textContent).toContain('₹12,500.00');
    expect(screen.getByTestId('venue-earnings-pending').textContent).toContain('₹900.50');
    expect(screen.getByTestId('venue-earnings-pods').textContent).toContain('7');
    expect(await screen.findByText('Sunrise Yoga')).toBeTruthy();
    expect(screen.getByText('₹950.00')).toBeTruthy();
  });

  it('says when no payout has been released yet', async () => {
    renderWithProviders(<VenueEarningsPage />, {
      mocks: [earningsMock({ myVenueEarningsSummary: summary, myVenuePayouts: [] })],
    });

    expect(await screen.findByText('Payouts appear here after a pod at your venue completes.')).toBeTruthy();
  });

  it('shows the server error instead of empty totals', async () => {
    renderWithProviders(<VenueEarningsPage />, {
      mocks: [{ request: { query: VENUE_EARNINGS, variables: {} }, error: new Error('Earnings are unavailable') }],
    });

    expect((await screen.findByTestId('venue-earnings-error')).textContent).toBe('Earnings are unavailable');
    expect(screen.queryByTestId('venue-earnings-stats')).toBeNull();
  });
});
