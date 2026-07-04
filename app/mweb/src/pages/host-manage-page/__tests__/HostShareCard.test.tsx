import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import HostShareCard, { MY_HOST_PAYOUTS } from '../HostShareCard';

const breakdown = (over: Record<string, unknown> = {}) => ({
  collected_total: 1000,
  venue_bill: 300,
  gst_pct: 18,
  gst_amount: 152.54,
  duncit_pct: 5,
  duncit_amount: 42.37,
  payout_pct: 35,
  payout_amount: 454.58,
  version: 1,
  share_amount: 0,
  commission_pct: 0,
  commission_amount: 0,
  ...over,
});

const mocks = [
  {
    request: { query: MY_HOST_PAYOUTS },
    result: {
      data: {
        myHostPayouts: [
          {
            id: 'v2-payout',
            pod_title: 'Waterfall Pod',
            status: 'PENDING',
            amount_requested: 454.58,
            approved_amount: null,
            created_at: '2026-06-01T10:00:00.000Z',
            breakdown: breakdown({
              version: 2,
              share_amount: 505.09,
              commission_pct: 10,
              commission_amount: 50.51,
              payout_amount: 454.58,
            }),
          },
          {
            id: 'v1-payout',
            pod_title: 'Legacy Pod',
            status: 'APPROVED',
            amount_requested: 400,
            approved_amount: 400,
            created_at: '2026-05-01T10:00:00.000Z',
            breakdown: breakdown(),
          },
        ],
        publicFinanceSettings: { currency_symbol: '₹' },
      },
    },
  },
];

describe('HostShareCard', () => {
  it('renders v2 payouts as your-amount − commission = payout', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <HostShareCard />
      </MockedProvider>,
    );
    expect(await screen.findByText('Waterfall Pod')).toBeInTheDocument();
    expect(screen.getByText('Your amount')).toBeInTheDocument();
    expect(screen.getByText('₹505.09')).toBeInTheDocument();
    expect(screen.getByText('− Commission (10%)')).toBeInTheDocument();
    expect(screen.getByText('Payout')).toBeInTheDocument();
    expect(screen.getByText('₹454.58')).toBeInTheDocument();

    // The v1 payout keeps the legacy venue-bill/GST lines.
    expect(screen.getByText('Legacy Pod')).toBeInTheDocument();
    expect(screen.getByText('Venue bill')).toBeInTheDocument();
    expect(screen.getByText('GST (18%)')).toBeInTheDocument();
    expect(screen.getByText('Your Commission (35%)')).toBeInTheDocument();
  });
});
