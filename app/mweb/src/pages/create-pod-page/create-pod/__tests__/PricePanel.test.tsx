import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import PricePanel, { POTENTIAL_POD_EARNINGS } from '../price-panel';
import { buildChargeGroups } from '../price-panel/ChargesAccordion';

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

describe('buildChargeGroups', () => {
  it('groups platform-side vs venue-side charges and reconciles the total', () => {
    const groups = buildChargeGroups(waterfall, true);
    expect(groups.gstLines.map((l) => l.label)).toEqual(['GST (18%)', 'Platform Fee (5%)']);
    expect(groups.venueLines.map((l) => l.label)).toEqual([
      'Venue slot price',
      'Duncit Commission from Venue (10%)',
    ]);
    expect(groups.gstTotal).toBe(5652.54);
    expect(groups.venueTotal).toBe(2604.75);
    // Total deductions = collection − payout; the groups must sum to it.
    expect(groups.totalDeductions).toBe(8257.29);
    expect(Math.round((groups.gstTotal + groups.venueTotal) * 100) / 100).toBe(
      groups.totalDeductions,
    );
  });

  it('folds the Duncit commission and club-admin cut into the platform group without a venue', () => {
    const clubWaterfall = {
      ...waterfall,
      venue_amount: 0,
      club_admin_pct: 3,
      club_admin_amount: 700.42,
    };
    const groups = buildChargeGroups(clubWaterfall, false);
    expect(groups.gstLines.map((l) => l.label)).toEqual([
      'GST (18%)',
      'Platform Fee (5%)',
      'Club Admin (3%)',
      'Duncit Commission (10%)',
    ]);
    expect(groups.venueLines).toEqual([]);
    expect(groups.venueTotal).toBe(0);
  });
});

describe('PricePanel (potentialPodEarnings)', () => {
  it('renders the header, subtitle and free-spot message', () => {
    setup(1000, 30);
    expect(screen.getByTestId('create-pod-price-panel')).toBeInTheDocument();
    expect(screen.getByText('Potential earnings')).toBeInTheDocument();
    expect(screen.getByText('Your take-home for the full pod')).toBeInTheDocument();
    expect(screen.getByTestId('price-panel-host-free-note')).toHaveTextContent(
      'Your spot is free — that is why the total calculation is based on the remaining available slots.',
    );
  });

  it('bills payable spots (total − 1) and groups the charges under accordions', async () => {
    setup(1000, 30);
    // The payout card is the strongest element: total take-home + pax + share.
    expect(await screen.findByText('You will receive')).toBeInTheDocument();
    expect(screen.getByText('₹20742.71')).toBeInTheDocument();
    expect(screen.getByText('For 29 paying pax')).toBeInTheDocument();
    expect(screen.getByText('71.53% of collection')).toBeInTheDocument();
    // 29 paying guests, not 30 — the label must match what the server billed.
    expect(screen.getByText('Total collection (₹1,000 × 29)')).toBeInTheDocument();
    expect(screen.getByText('₹29000.00')).toBeInTheDocument();
    // The main accordion header carries the total deductions.
    expect(screen.getByText('Govt. and other charges')).toBeInTheDocument();
    expect(screen.getAllByText('₹8257.29').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total deductions')).toBeInTheDocument();
    // Group headers with their totals.
    expect(screen.getByText('1. GST and other charges')).toBeInTheDocument();
    expect(screen.getByText('2. Venue charges')).toBeInTheDocument();
    expect(screen.getByText('₹5652.54')).toBeInTheDocument();
    expect(screen.getByText('₹2604.75')).toBeInTheDocument();
    expect(screen.getByText(/Estimates at today's rates/)).toBeInTheDocument();
    // The old commission naming is gone.
    expect(screen.queryByText(/Your Commission/)).not.toBeInTheDocument();
  });

  it('expands a charge group to reveal its rows', async () => {
    setup(1000, 30);
    await screen.findByText('You will receive');
    // Sub-groups start collapsed; the row detail appears after a click.
    fireEvent.click(screen.getByRole('button', { name: /1\. GST and other charges/ }));
    expect(screen.getByText('• GST (18%)')).toBeVisible();
    expect(screen.getByText('₹4423.73')).toBeVisible();
    expect(screen.getByText('• Platform Fee (5%)')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /2\. Venue charges/ }));
    expect(screen.getByText('• Venue slot price')).toBeVisible();
    expect(screen.getByText('₹300.00')).toBeVisible();
    expect(screen.getByText('• Duncit Commission from Venue (10%)')).toBeVisible();
    expect(screen.getByText('₹2304.75')).toBeVisible();
  });

  it('collapses the main charges accordion', async () => {
    setup(1000, 30);
    await screen.findByText('You will receive');
    fireEvent.click(screen.getByRole('button', { name: /Govt\. and other charges/ }));
    // Headers collapse away (unmounted after the exit transition); payout stays.
    await waitFor(() =>
      expect(screen.queryByText('1. GST and other charges')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('You will receive')).toBeVisible();
  });

  it('shows a loading spinner while the waterfall is in flight', () => {
    setup(1000, 30);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('skips the query and shows a hint until both price and spots are set', () => {
    setup(1000, 0);
    expect(
      screen.getByText('Set a ticket price and the number of spots to preview your earnings.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('You will receive')).not.toBeInTheDocument();
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
    expect(screen.queryByText('You will receive')).not.toBeInTheDocument();
  });

  it('renders a Club Admin row inside the platform group when a cut applies', async () => {
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
    await screen.findByText('You will receive');
    fireEvent.click(screen.getByRole('button', { name: /1\. GST and other charges/ }));
    expect(screen.getByText('• Club Admin (3%)')).toBeVisible();
    expect(screen.getByText('₹700.42')).toBeVisible();
  });

  it('omits the venue group for a non-physical pod (commission joins the platform group)', async () => {
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
    expect(await screen.findByText('You will receive')).toBeInTheDocument();
    expect(screen.queryByText('2. Venue charges')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /1\. GST and other charges/ }));
    expect(screen.getByText('• Duncit Commission (10%)')).toBeVisible();
  });
});
