import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import PricePanel, { POTENTIAL_POD_EARNINGS } from '../PricePanel';

// Structurally identical to the hook's private document so Apollo matches it.
const PUBLIC_FINANCE = gql`
  query PublicFinanceSettingsForPricing {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
    }
  }
`;

// Canonical vector: ₹1000 ticket, slot ₹300, GST 18 / fee 5 / commission 10.
const waterfall = {
  amount: 1000,
  gst_pct: 18,
  gst_amount: 152.54,
  platform_fee_pct: 5,
  platform_fee_amount: 42.37,
  venue_amount: 300,
  host_amount: 505.09,
  host_commission_pct: 10,
  host_commission_amount: 50.51,
  host_receives: 454.58,
  host_earn_pct: 45.46,
};

const mocks = [
  {
    request: { query: PUBLIC_FINANCE },
    result: {
      data: { publicFinanceSettings: { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '₹' } },
    },
  },
  {
    request: {
      query: POTENTIAL_POD_EARNINGS,
      variables: { amount: 1000, venue_id: 'v1', venue_amount: 300 },
    },
    result: { data: { potentialPodEarnings: waterfall } },
  },
];

function setup(podAmount: number, noOfSpots = 0) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <PricePanel slotPrice={300} podAmount={podAmount} noOfSpots={noOfSpots} venueId="v1" isPhysical />
    </MockedProvider>,
  );
}

describe('PricePanel (potentialPodEarnings)', () => {
  it('renders the server waterfall as the Quick Breakdown', async () => {
    setup(1000);
    expect(await screen.findByText('₹454.58')).toBeInTheDocument();
    expect(screen.getByText('Customer Pays')).toBeInTheDocument();
    expect(screen.getByText('− GST (18%)')).toBeInTheDocument();
    expect(screen.getByText('− Platform Fee (5%)')).toBeInTheDocument();
    expect(screen.getByText('− Venue slot price')).toBeInTheDocument();
    expect(screen.getByText('Your Amount (remainder)')).toBeInTheDocument();
    expect(screen.getByText('− Your Commission (10%)')).toBeInTheDocument();
    expect(screen.getByText('You Receive')).toBeInTheDocument();
    expect(screen.getByText('(45.46% of customer amount) · per booking')).toBeInTheDocument();
    // The non-canonical "GST on slot / Total venue cost" block is gone — the
    // waterfall's own "− Venue slot price" deduction is the single source.
    expect(screen.queryByText('Total venue cost')).not.toBeInTheDocument();
  });

  it('skips the query and shows a hint when the amount is zero', () => {
    setup(0);
    expect(screen.getByText('Set a ticket price to preview your earnings.')).toBeInTheDocument();
    expect(screen.queryByText('You Receive')).not.toBeInTheDocument();
  });

  it('shows the ticket × spots total and the host total take-home when both are set', async () => {
    setup(1000, 30);
    expect(screen.getByText('Total collection (₹1,000 × 30)')).toBeInTheDocument();
    expect(screen.getByText('₹30,000')).toBeInTheDocument();
    // host_receives 454.58 × 30 spots = 13,637.40 final take-home.
    expect(await screen.findByText('Total take-home (30 spots)')).toBeInTheDocument();
    expect(screen.getByText('₹13637.40')).toBeInTheDocument();
  });
});
