import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import PricePanel, {
  POTENTIAL_POD_EARNINGS,
  useEarningsPreview,
  type EarningsPreview,
} from '../price-panel';

interface HarnessProps {
  slotPrice: number | null;
  podAmount: number;
  noOfSpots: number;
  venueId: string | null;
  isPhysical: boolean;
  isFree?: boolean;
  onPreview?: (preview: EarningsPreview) => void;
}

/** The panel is now fed by the shared Step-4 preview hook (the stepper owns it
 * so the footer can block Create Pod), so the test drives the hook. */
function Harness({ onPreview, isFree = false, ...input }: Readonly<HarnessProps>) {
  const preview = useEarningsPreview({ ...input, isFree });
  onPreview?.(preview);
  return <PricePanel preview={preview} />;
}

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
  net_amount: 24576.27,
  platform_fee_pct: 5,
  platform_fee_amount: 1228.81,
  pool_amount: 23347.46,
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
      <Harness slotPrice={300} podAmount={podAmount} noOfSpots={noOfSpots} venueId="v1" isPhysical />
    </MockedProvider>,
  );
}

describe('PricePanel (auditable earnings statement)', () => {
  it('renders the header, subtitle and free-spot message', () => {
    setup(1000, 30);
    expect(screen.getByTestId('create-pod-price-panel')).toBeInTheDocument();
    expect(screen.getByText('Potential earnings')).toBeInTheDocument();
    expect(screen.getByText('Your take-home for the full pod')).toBeInTheDocument();
    expect(screen.getByTestId('price-panel-host-free-note')).toHaveTextContent(
      'Your spot is free — that is why the total calculation is based on the remaining available slots.',
    );
  });

  it('shows the collection with en-IN formatting and the included-GST disclosure', async () => {
    setup(1000, 30);
    expect(await screen.findByText('Total collection (₹1,000.00 × 29)')).toBeInTheDocument();
    expect(screen.getAllByText('₹29,000.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('price-panel-included-gst')).toHaveTextContent(
      'Includes GST ₹4,423.73 — prices are GST-inclusive',
    );
  });

  it('shows every section with its subtotal and the exact total deductions', async () => {
    setup(1000, 30);
    await screen.findByText('You will receive');
    expect(screen.getByText('Govt. and other charges')).toBeInTheDocument();
    // Total deductions = collection − payout, on the header and the footer row.
    expect(screen.getAllByText('₹8,257.29').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total deductions')).toBeInTheDocument();
    expect(screen.getByText('Taxes')).toBeInTheDocument();
    expect(screen.getByText('₹4,423.73')).toBeInTheDocument();
    expect(screen.getByText('Platform Charges')).toBeInTheDocument();
    expect(screen.getByText('₹1,228.81')).toBeInTheDocument();
    expect(screen.getByText('Venue Charges')).toBeInTheDocument();
    expect(screen.getByText('₹2,604.75')).toBeInTheDocument();
    // Reconciled statement → no warning.
    expect(screen.queryByTestId('price-panel-reconcile-warning')).not.toBeInTheDocument();
    // The old commission naming is gone.
    expect(screen.queryByText(/Your Commission/)).not.toBeInTheDocument();
  });

  it('reveals the taxable base, rates and formulas inside each section', async () => {
    setup(1000, 30);
    await screen.findByText('You will receive');
    fireEvent.click(screen.getByRole('button', { name: /Taxes/ }));
    // The GST row shows its taxable base and the formula that produced it.
    expect(screen.getByText('Taxable Amount')).toBeVisible();
    expect(screen.getByText('₹24,576.27')).toBeVisible();
    expect(screen.getByText('GST @18%')).toBeVisible();
    expect(screen.getByText('Formula: ₹24,576.27 × 18%')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Platform Charges/ }));
    expect(screen.getByText('Platform Fee @5%')).toBeVisible();
    expect(screen.getByText('Formula: ₹24,576.27 × 5%')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Venue Charges/ }));
    expect(screen.getByText('Venue Slot Price')).toBeVisible();
    expect(screen.getByText('₹300.00')).toBeVisible();
    expect(screen.getByText('Formula: Fixed booked slot price (deducted once per pod)')).toBeVisible();
    expect(screen.getByText('Duncit Commission from Venue @10%')).toBeVisible();
    expect(screen.getByText('Formula: ₹23,047.46 × 10% (your remainder)')).toBeVisible();
  });

  it('renders the Net Payout arithmetic inside the payout card', async () => {
    setup(1000, 30);
    await screen.findByText('You will receive');
    const netPayout = screen.getByTestId('price-panel-net-payout');
    expect(netPayout).toHaveTextContent('Total Collection');
    expect(netPayout).toHaveTextContent('− Total Deductions');
    expect(netPayout).toHaveTextContent('₹8,257.29');
    expect(netPayout).toHaveTextContent('= You will receive');
    expect(netPayout).toHaveTextContent('₹20,742.71');
    expect(screen.getByText('For 29 paying pax')).toBeInTheDocument();
    expect(screen.getByText('71.53% of collection')).toBeInTheDocument();
    expect(screen.getByText(/Estimates at today's rates/)).toBeInTheDocument();
  });

  it('collapses the main charges accordion', async () => {
    setup(1000, 30);
    await screen.findByText('You will receive');
    fireEvent.click(screen.getByRole('button', { name: /Govt\. and other charges/ }));
    await waitFor(() => expect(screen.queryByText('Taxes')).not.toBeInTheDocument());
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

  it('renders the Club Charges section with the pool-based formula when a cut applies', async () => {
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
        <Harness slotPrice={300} podAmount={1000} noOfSpots={30} venueId="v1" isPhysical />
      </MockedProvider>,
    );
    await screen.findByText('You will receive');
    fireEvent.click(screen.getByRole('button', { name: /Club Charges/ }));
    expect(screen.getByText('Club Admin Fee @3%')).toBeVisible();
    expect(screen.getAllByText('₹700.42').length).toBeGreaterThanOrEqual(2); // header total + row
    expect(screen.getByText('Formula: ₹23,347.46 × 3%')).toBeVisible();
  });

  it('folds the Duncit commission into Platform Charges for a non-physical pod', async () => {
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
        <Harness slotPrice={300} podAmount={1000} noOfSpots={30} venueId="v1" isPhysical={false} />
      </MockedProvider>,
    );
    expect(await screen.findByText('You will receive')).toBeInTheDocument();
    expect(screen.queryByText('Venue Charges')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Platform Charges/ }));
    expect(screen.getByText('Duncit Commission @10%')).toBeVisible();
  });
});
