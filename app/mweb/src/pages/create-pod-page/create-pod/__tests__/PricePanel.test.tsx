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

// The waterfall is computed on the FULL collection (ticket ₹1000 × 30 pax =
// ₹30,000) with the venue's ₹300 slot price deducted ONCE for the pod.
const waterfall = {
  amount: 30000,
  gst_pct: 18,
  gst_amount: 4576.27,
  platform_fee_pct: 5,
  platform_fee_amount: 1271.19,
  venue_amount: 300,
  host_amount: 23852.54,
  host_commission_pct: 10,
  host_commission_amount: 2385.25,
  host_receives: 21467.29,
  host_earn_pct: 71.56,
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
      variables: { amount: 30000, venue_id: 'v1', venue_amount: 300 },
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
  it('runs the waterfall on the full collection (ticket × pax) with the venue once', async () => {
    setup(1000, 30);
    // You Receive is the host's TOTAL take-home for the whole pod, not per-booking.
    expect(await screen.findByText('₹21467.29')).toBeInTheDocument();
    expect(screen.getByText('Total collection (₹1,000 × 30)')).toBeInTheDocument();
    expect(screen.getByText('₹30000.00')).toBeInTheDocument();
    expect(screen.getByText('− GST (18%)')).toBeInTheDocument();
    expect(screen.getByText('− Platform Fee (5%)')).toBeInTheDocument();
    // The venue slot price is deducted exactly once (₹300, not ₹300 × 30).
    expect(screen.getByText('− Venue slot price')).toBeInTheDocument();
    expect(screen.getByText('₹300.00')).toBeInTheDocument();
    expect(screen.getByText('Your Amount (remainder)')).toBeInTheDocument();
    expect(screen.getByText('− Your Commission (10%)')).toBeInTheDocument();
    expect(screen.getByText('You Receive')).toBeInTheDocument();
    expect(screen.getByText('For 30 pax · 71.56% of collection')).toBeInTheDocument();
    // The old per-booking framing is gone.
    expect(screen.queryByText(/per booking/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Total take-home/)).not.toBeInTheDocument();
  });

  it('skips the query and shows a hint until both price and spots are set', () => {
    setup(1000, 0);
    expect(
      screen.getByText('Set a ticket price and the number of spots to preview your earnings.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('You Receive')).not.toBeInTheDocument();
  });
});
