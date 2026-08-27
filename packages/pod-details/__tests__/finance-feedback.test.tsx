/**
 * The two money-and-opinion cards in the sidebar.
 *
 * Finance shows where every rupee of the pod went and whether the payout is
 * still moving; Ratings shows what the guests scored, part by part, and the
 * comments that say why. Each is exercised on the data it actually renders —
 * the page suite only ever sees their error states.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PodFeedbackSection from '../src/PodFeedbackSection';
import PodFinanceSection from '../src/PodFinanceSection';
import { POD_FEEDBACK_SUMMARY, POD_FINANCE_BREAKDOWN } from '../src/queries';
import { POD_ID, mountSection, settle } from './harness';

const waterfall = {
  __typename: 'PodFinanceWaterfall',
  version: 2,
  amount: 1000,
  gst_pct: 18,
  gst_amount: 152.54,
  net_amount: 847.46,
  platform_fee_pct: 10,
  platform_fee_amount: 84.75,
  pool_amount: 762.71,
  venue_amount: 300,
  venue_commission_pct: 10,
  venue_commission_amount: 30,
  venue_receives: 270,
  host_amount: 462.71,
  host_commission_pct: 20,
  host_commission_amount: 92.54,
  host_receives: 370.17,
  duncit_revenue: 207.29,
  host_earn_pct: 80,
};

const breakdown = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodFinanceBreakdown',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  settlement_status: 'LIVE',
  frozen: false,
  bookings_count: 4,
  collected_total: 1000,
  currency_symbol: '₹',
  has_venue: true,
  completed_at: null,
  waterfall,
  ...over,
});

const financeMock = (result: Record<string, unknown> | null): MockedResponse => ({
  request: { query: POD_FINANCE_BREAKDOWN, variables: { pod_id: POD_ID } },
  result: { data: { podFinanceBreakdown: result } },
});

describe('PodFinanceSection', () => {
  it('renders the settlement state, the totals and the waterfall', async () => {
    mountSection(<PodFinanceSection podId={POD_ID} />, [financeMock(breakdown())]);
    await settle();

    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    // Once in the summary, once as the waterfall's "Customer Paid" line.
    expect(screen.getAllByText('₹1000.00')).toHaveLength(2);
    expect(screen.getByText('Venue price')).toBeInTheDocument();
    expect(screen.getByText('Host receives')).toBeInTheDocument();
    expect(screen.getByText('Payouts are released after Finance approval.')).toBeInTheDocument();
    expect(screen.queryByText('Frozen snapshot')).not.toBeInTheDocument();
  });

  it('marks a frozen snapshot awaiting Finance approval', async () => {
    mountSection(<PodFinanceSection podId={POD_ID} />, [
      financeMock(breakdown({ settlement_status: 'PENDING_APPROVAL', frozen: true })),
    ]);
    await settle();

    expect(screen.getByText('Pending approval')).toBeInTheDocument();
    expect(screen.getByText('Frozen snapshot')).toBeInTheDocument();
  });

  it('leaves the venue line out of a pod that has no venue', async () => {
    mountSection(<PodFinanceSection podId={POD_ID} />, [
      financeMock(breakdown({ settlement_status: 'SETTLED', has_venue: false })),
    ]);
    await settle();

    expect(screen.getByText('Settled')).toBeInTheDocument();
    expect(screen.queryByText('Venue price')).not.toBeInTheDocument();
  });

  it('shows no status chip for a settlement state it has no word for', async () => {
    mountSection(<PodFinanceSection podId={POD_ID} />, [financeMock(breakdown({ settlement_status: 'ARCHIVED' }))]);
    await settle();

    expect(screen.getByText('Bookings')).toBeInTheDocument();
    for (const label of ['Live', 'Pending approval', 'Settled']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it('says when nothing has been settled yet', async () => {
    mountSection(<PodFinanceSection podId={POD_ID} />, [financeMock(null)]);
    await settle();

    expect(screen.getByText('No settlement recorded for this pod yet.')).toBeInTheDocument();
  });

  it('shows its own sentence when the breakdown cannot be read', async () => {
    mountSection(<PodFinanceSection podId={POD_ID} />, [
      { request: { query: POD_FINANCE_BREAKDOWN, variables: { pod_id: POD_ID } }, error: new Error('nope') },
    ]);
    await settle();

    expect(screen.getByText('Finance breakdown is not available for this pod.')).toBeInTheDocument();
  });
});

const entry = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodFeedback',
  id: 'fb-1',
  rating: 4,
  message: 'Great courts, host was late.',
  created_at: '2026-08-31T09:00:00.000Z',
  category: 'GENERAL',
  user: { __typename: 'FeedbackUser', id: 'u-1', name: 'Meera N' },
  ratings: [
    { __typename: 'PodAspectScore', aspect: 'VENUE', rating: 5 },
    { __typename: 'PodAspectScore', aspect: 'HOST', rating: 2 },
  ],
  ...over,
});

const summary = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodFeedbackSummary',
  pod_id: 'DUN-POD-4821',
  total: 12,
  overall_average: 4.5,
  aspects: [
    { __typename: 'PodAspectRating', aspect: 'VENUE', average: 4.8, count: 12 },
    { __typename: 'PodAspectRating', aspect: 'PARKING', average: 3.2, count: 5 },
  ],
  recent: [entry()],
  ...over,
});

const feedbackMock = (result: Record<string, unknown>): MockedResponse => ({
  request: { query: POD_FEEDBACK_SUMMARY, variables: { pod_id: POD_ID } },
  result: { data: { podFeedbackSummary: result } },
});

describe('PodFeedbackSection', () => {
  it('leads with the average, then each part, then who said what', async () => {
    mountSection(<PodFeedbackSection podId={POD_ID} />, [feedbackMock(summary())]);
    await settle();

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('12 ratings')).toBeInTheDocument();
    expect(screen.getByText('Venue')).toBeInTheDocument();
    expect(screen.getByText('4.8 · 12')).toBeInTheDocument();
    // An aspect the shared label map does not know is shown as itself.
    expect(screen.getByText('PARKING')).toBeInTheDocument();
    expect(screen.getByText('Meera N')).toBeInTheDocument();
    expect(screen.getByText('Great courts, host was late.')).toBeInTheDocument();
    expect(screen.getByText('Venue 5')).toBeInTheDocument();
    expect(screen.getByText('Host 2')).toBeInTheDocument();
  });

  it('uses the singular for one rating', async () => {
    mountSection(<PodFeedbackSection podId={POD_ID} />, [feedbackMock(summary({ total: 1, recent: [] }))]);
    await settle();

    expect(screen.getByText('1 rating')).toBeInTheDocument();
    expect(screen.queryByText('Meera N')).not.toBeInTheDocument();
  });

  it('renders a rating with no comment and no per-part scores', async () => {
    mountSection(<PodFeedbackSection podId={POD_ID} />, [
      feedbackMock(summary({ recent: [entry({ message: '', ratings: [] })] })),
    ]);
    await settle();

    expect(screen.getByText('Meera N')).toBeInTheDocument();
    expect(screen.queryByText('Venue 5')).not.toBeInTheDocument();
  });

  it('says when nobody has rated the pod', async () => {
    mountSection(<PodFeedbackSection podId={POD_ID} />, [
      feedbackMock(summary({ total: 0, overall_average: 0, aspects: [], recent: [] })),
    ]);
    await settle();

    expect(screen.getByText('No one has rated this pod yet.')).toBeInTheDocument();
  });

  it('shows its own sentence when ratings cannot be read', async () => {
    mountSection(<PodFeedbackSection podId={POD_ID} />, [
      { request: { query: POD_FEEDBACK_SUMMARY, variables: { pod_id: POD_ID } }, error: new Error('nope') },
    ]);
    await settle();

    expect(screen.getByText('Ratings are not available for this pod.')).toBeInTheDocument();
  });
});
