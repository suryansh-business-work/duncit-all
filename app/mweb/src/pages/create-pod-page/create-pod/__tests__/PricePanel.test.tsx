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
      default_backout_deduction_pct
    }
  }
`;

const financeMock = {
  request: { query: PUBLIC_FINANCE },
  result: {
    data: {
      publicFinanceSettings: {
        platform_fee_pct: 5,
        gst_pct: 18,
        currency_symbol: '₹',
        default_backout_deduction_pct: 20,
      },
    },
  },
};

// The host's own spot is FREE, so a 30-spot pod bills 29 guests: ticket ₹1,000 ×
// 29 = ₹29,000, with the venue's ₹300 slot price deducted ONCE for the pod.
const waterfall = {
  amount: 29000,
  gst_pct: 18,
  gst_amount: 4423.73,
  platform_fee_pct: 5,
  platform_fee_amount: 1228.81,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 300,
  host_amount: 23047.46,
  host_commission_pct: 10,
  host_commission_amount: 2304.75,
  host_receives: 20742.71,
  host_earn_pct: 71.53,
};

const projection = { total_spots: 30, payable_spots: 29, waterfall };

const venueVariables = { pod_amount: 1000, no_of_spots: 30, venue_id: 'v1', venue_amount: 300 };

const venueMocks = [
  financeMock,
  {
    request: { query: POTENTIAL_POD_EARNINGS, variables: venueVariables },
    result: { data: { potentialPodEarnings: projection } },
  },
];

function setup(podAmount: number, noOfSpots = 0) {
  return render(
    <MockedProvider mocks={venueMocks} addTypename={false}>
      <PricePanel slotPrice={300} podAmount={podAmount} noOfSpots={noOfSpots} venueId="v1" isPhysical />
    </MockedProvider>,
  );
}

describe('PricePanel (potentialPodEarnings)', () => {
  it('renders the header, subtitle and disclaimer chrome', () => {
    setup(1000, 0);
    expect(screen.getByTestId('create-pod-price-panel')).toBeInTheDocument();
    expect(screen.getByText('Potential earnings')).toBeInTheDocument();
    expect(screen.getByText('Your take-home for the full pod')).toBeInTheDocument();
    expect(screen.getByText(/Estimates at today's rates/)).toBeInTheDocument();
  });

  it('bills payable spots (total − 1) because the host seat is free', async () => {
    setup(1000, 30);
    // You Receive is the host's TOTAL take-home for the whole pod, not per-booking.
    expect(await screen.findByText('₹20742.71')).toBeInTheDocument();
    // 29 paying guests, not 30 — the label must match what the server billed.
    expect(screen.getByText('Total collection (₹1,000 × 29)')).toBeInTheDocument();
    expect(screen.getByText('₹29000.00')).toBeInTheDocument();
    expect(screen.getByText('For 29 paying pax · 71.53% of collection')).toBeInTheDocument();
    expect(screen.getByText('− GST (18%)')).toBeInTheDocument();
    expect(screen.getByText('− Platform Fee (5%)')).toBeInTheDocument();
    // The venue slot price is deducted exactly once (₹300, not ₹300 × 29).
    expect(screen.getByText('− Venue slot price')).toBeInTheDocument();
    expect(screen.getByText('₹300.00')).toBeInTheDocument();
    expect(screen.getByText('Your Amount (remainder)')).toBeInTheDocument();
    expect(screen.getByText('− Your Commission (10%)')).toBeInTheDocument();
    expect(screen.getByText('You Receive')).toBeInTheDocument();
    // club_admin_amount is 0 → no club admin row.
    expect(screen.queryByText(/Club Admin/)).not.toBeInTheDocument();
    // The old per-booking framing is gone.
    expect(screen.queryByText(/per booking/)).not.toBeInTheDocument();
  });

  it('explains that the host spot is free and shows the total − 1 maths', () => {
    setup(1000, 30);
    expect(screen.getByTestId('price-panel-host-free-note')).toHaveTextContent(
      'Your spot is free — the calculation is based on total spots − 1 (30 − 1 = 29).',
    );
  });

  it('shows a loading spinner while the waterfall is in flight', () => {
    setup(1000, 30);
    // Before the mock resolves, breakdown() renders a CircularProgress.
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('skips the query and shows a hint until both price and spots are set', () => {
    setup(1000, 0);
    expect(
      screen.getByText('Set a ticket price and the number of spots to preview your earnings.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('You Receive')).not.toBeInTheDocument();
    // With no spots there is nothing to explain either.
    expect(screen.queryByTestId('price-panel-host-free-note')).not.toBeInTheDocument();
  });

  it('shows the hint when the ticket price is zero', () => {
    setup(0, 30);
    expect(
      screen.getByText('Set a ticket price and the number of spots to preview your earnings.'),
    ).toBeInTheDocument();
  });

  it('tells a 1-spot host there is nothing to bill (their seat is the free one)', () => {
    setup(1000, 1);
    expect(screen.getByTestId('price-panel-host-only')).toHaveTextContent(
      'This pod only has your own spot, which is free. Add more spots to earn.',
    );
    expect(screen.queryByText('You Receive')).not.toBeInTheDocument();
  });

  it('renders a Club Admin row when a club-admin cut applies', async () => {
    const clubProjection = {
      ...projection,
      waterfall: { ...waterfall, club_admin_pct: 3, club_admin_amount: 700.42 },
    };
    render(
      <MockedProvider
        mocks={[
          financeMock,
          {
            request: { query: POTENTIAL_POD_EARNINGS, variables: venueVariables },
            result: { data: { potentialPodEarnings: clubProjection } },
          },
        ]}
        addTypename={false}
      >
        <PricePanel slotPrice={300} podAmount={1000} noOfSpots={30} venueId="v1" isPhysical />
      </MockedProvider>,
    );
    expect(await screen.findByText('− Club Admin (3%)')).toBeInTheDocument();
    expect(screen.getByText('₹700.42')).toBeInTheDocument();
  });

  it('omits the venue slot price for a non-physical pod (no venue deduction)', async () => {
    const onlineProjection = { ...projection, waterfall: { ...waterfall, venue_amount: 0 } };
    render(
      <MockedProvider
        mocks={[
          financeMock,
          {
            request: {
              query: POTENTIAL_POD_EARNINGS,
              variables: { pod_amount: 1000, no_of_spots: 30, venue_id: null, venue_amount: null },
            },
            result: { data: { potentialPodEarnings: onlineProjection } },
          },
        ]}
        addTypename={false}
      >
        <PricePanel slotPrice={300} podAmount={1000} noOfSpots={30} venueId="v1" isPhysical={false} />
      </MockedProvider>,
    );
    expect(await screen.findByText('You Receive')).toBeInTheDocument();
    // hasVenue is false → the venue slot price row is not rendered.
    expect(screen.queryByText('− Venue slot price')).not.toBeInTheDocument();
  });
});
