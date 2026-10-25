import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { gql } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import type { OfferEarningsArgs } from '@duncit/utils';
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
  offerEarnings?: OfferEarningsArgs | null;
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
  venue_commission_pct: 10,
  venue_commission_amount: 30,
  venue_receives: 270,
  host_amount: 23047.46,
  host_commission_pct: 10,
  host_commission_amount: 2304.75,
  host_receives: 20742.71,
  host_earn_pct: 71.53,
};

const projection = { total_spots: 30, payable_spots: 29, waterfall };

const venueVariables = { pod_amount: 1000, no_of_spots: 30, venue_id: 'v1', venue_amount: 300, venue_commission_on_top: null };

const venueMocks = [
  financeMock,
  {
    request: { query: POTENTIAL_POD_EARNINGS, variables: venueVariables },
    result: { data: { potentialPodEarnings: projection } },
  },
];

function setup(podAmount: number, noOfSpots = 0) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={venueMocks}>
      <Harness slotPrice={300} podAmount={podAmount} noOfSpots={noOfSpots} venueId="v1" isPhysical />
    </MockedProvider>,
  );
}

describe('PricePanel (four-way earnings split, host first)', () => {
  it('renders the header as a section heading and the free-spot message', () => {
    setup(1000, 30);
    expect(screen.getByTestId('create-pod-price-panel')).toBeInTheDocument();
    // The calm redesign dropped the subtitle: the header is the title alone.
    expect(screen.getByRole('heading', { level: 2, name: 'Potential earnings' })).toBeInTheDocument();
    expect(screen.getByTestId('create-pod-price-panel-header')).toHaveTextContent(/^Potential earnings$/);
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

  it('leads with the host’s own earning, then where the rest goes', async () => {
    setup(1000, 30);
    await screen.findByText('Your Earning (Host)');
    const rows = within(screen.getByTestId('earnings-split'))
      .getAllByRole('button')
      .map((node) => node.getAttribute('aria-label'));
    expect(rows).toEqual([
      'Your Earning (Host)',
      'Venue Take',
      'Club Admin Take',
      'Duncit Commission & Govt Charges',
    ]);
    expect(screen.getByText('Where the rest goes')).toBeInTheDocument();
    // Host 20,742.71 · venue keeps 270 of its 300 · Duncit & govt = GST
    // 4,423.73 + fee 1,228.81 + host commission 2,304.75 + venue commission 30.
    expect(screen.getByText('₹20,742.71')).toBeInTheDocument();
    expect(screen.getByText('71.53% of collection')).toBeInTheDocument();
    expect(screen.getByText('₹270.00')).toBeInTheDocument();
    expect(screen.getByText('₹7,987.29')).toBeInTheDocument();
    expect(screen.queryByTestId('earnings-split-reconcile-warning')).not.toBeInTheDocument();
    // The old charges tree and payout card are gone.
    expect(screen.queryByText('Govt. and other charges')).not.toBeInTheDocument();
    expect(screen.queryByText('Total deductions')).not.toBeInTheDocument();
  });

  it('opens each row onto its own hand-checkable breakdown', async () => {
    setup(1000, 30);
    await screen.findByText('Your Earning (Host)');
    expect(screen.queryByText('Commission from host @10%')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Duncit Commission & Govt Charges' }));
    expect(await screen.findByText('Commission from host @10%')).toBeVisible();
    expect(screen.getByText('₹23,047.46 × 10%')).toBeVisible();
    expect(screen.getByText('GST @18% (paid to Govt.)')).toBeVisible();
    expect(screen.getByText('₹29,000.00 (total collection) × 18 ÷ 118')).toBeVisible();
    expect(screen.getByText('Platform fee @5%')).toBeVisible();
    expect(screen.getByText('₹24,576.27 × 5%')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Venue Take' }));
    expect(await screen.findByText('Venue slot price')).toBeVisible();
    expect(screen.getByText('₹300.00')).toBeVisible();
    // Duncit's ₹30 venue commission: less'd on the venue row, counted in Duncit's.
    expect(screen.getAllByText('₹30.00')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Your Earning (Host)' }));
    expect(await screen.findByText('You will receive')).toBeVisible();
    expect(
      screen.getByText('₹29,000.00 − ₹270.00 venue − ₹0.00 club admin − ₹7,987.29 Duncit & Govt.'),
    ).toBeVisible();
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
    expect(screen.queryByText('Your Earning (Host)')).not.toBeInTheDocument();
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
    expect(screen.queryByText('Your Earning (Host)')).not.toBeInTheDocument();
  });

  it('shows the club admin take with its pool-based formula when a cut applies', async () => {
    // Club admin 3% of the ₹23,347.46 pool; the host side shrinks by it.
    const clubProjection = {
      ...projection,
      waterfall: {
        ...waterfall,
        club_admin_pct: 3,
        club_admin_amount: 700.42,
        host_amount: 22347.04,
        host_commission_amount: 2234.7,
        host_receives: 20112.34,
        host_earn_pct: 69.35,
      },
    };
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[
          financeMock,
          {
            request: { query: POTENTIAL_POD_EARNINGS, variables: venueVariables },
            result: { data: { potentialPodEarnings: clubProjection } },
          },
        ]}
      >
        <Harness slotPrice={300} podAmount={1000} noOfSpots={30} venueId="v1" isPhysical />
      </MockedProvider>,
    );
    await screen.findByText('Your Earning (Host)');
    expect(screen.getByText('₹20,112.34')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Club Admin Take' }));
    expect(await screen.findByText('Club admin share @3%')).toBeVisible();
    expect(screen.getAllByText('₹700.42')).toHaveLength(2); // row header + breakdown
    expect(screen.getByText('₹23,347.46 (after GST & platform fee) × 3%')).toBeVisible();
    expect(screen.queryByTestId('earnings-split-reconcile-warning')).not.toBeInTheDocument();
  });

  it('shows a nil venue take for a non-physical pod', async () => {
    const onlineProjection = {
      ...projection,
      waterfall: {
        ...waterfall,
        venue_amount: 0,
        venue_commission_amount: 0,
        venue_receives: 0,
        host_amount: 23347.46,
        host_commission_amount: 2334.75,
        host_receives: 21012.71,
        host_earn_pct: 72.46,
      },
    };
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[
          financeMock,
          {
            request: {
              query: POTENTIAL_POD_EARNINGS,
              variables: { pod_amount: 1000, no_of_spots: 30, venue_id: null, venue_amount: null, venue_commission_on_top: null },
            },
            result: { data: { potentialPodEarnings: onlineProjection } },
          },
        ]}
      >
        <Harness slotPrice={300} podAmount={1000} noOfSpots={30} venueId="v1" isPhysical={false} />
      </MockedProvider>,
    );
    expect(await screen.findByText('₹21,012.71')).toBeInTheDocument();
    expect(screen.getAllByText('₹0.00')).toHaveLength(2); // venue + club admin
  });

  it('prices an instant booking at the venue payout, with Duncit’s commission on top sent apart', async () => {
    // The quote's total is ₹384: the venue is paid ₹354 (price + GST) and Duncit's ₹30 rides on top.
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[
          financeMock,
          {
            request: {
              query: POTENTIAL_POD_EARNINGS,
              variables: { pod_amount: 1000, no_of_spots: 30, venue_id: 'v1', venue_amount: 354, venue_commission_on_top: 30 },
            },
            result: { data: { potentialPodEarnings: projection } },
          },
        ]}
      >
        <Harness
          slotPrice={384}
          offerEarnings={{ venue_amount: 354, venue_commission_on_top: 30 }}
          podAmount={1000}
          noOfSpots={30}
          venueId="v1"
          isPhysical
        />
      </MockedProvider>,
    );
    // Only the matching variables resolve, so the host's earning proves what was sent.
    expect(await screen.findByText('₹20,742.71')).toBeInTheDocument();
    // No minimum was asked, so the take-home is one amount, not a range.
    expect(screen.queryByTestId('price-panel-earnings-range')).not.toBeInTheDocument();
  });
});

describe('PricePanel — a venue offer paid for at least the venue minimum', () => {
  // At the venue's minimum of 8 guests: 7 paying tickets, the venue's ₹2,640 cost at 8.
  const ranged = { venue_amount: 6000, venue_commission_on_top: 600, min_spots: 8, venue_amount_at_min: 2400, venue_commission_on_top_at_min: 240 };
  const rangedVariables = { pod_amount: 1000, no_of_spots: 30, venue_id: 'v1', ...ranged };
  const withMinimum = (hostAtFewest: number) => ({
    ...projection,
    minimum: { total_spots: 8, waterfall: { host_receives: hostAtFewest } },
  });
  const panel = (hostAtFewest: number, onPreview?: (preview: EarningsPreview) => void) =>
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[
          financeMock,
          {
            request: { query: POTENTIAL_POD_EARNINGS, variables: rangedVariables },
            result: { data: { potentialPodEarnings: withMinimum(hostAtFewest) } },
          },
        ]}
      >
        <Harness slotPrice={6600} offerEarnings={ranged} podAmount={1000} noOfSpots={30} venueId="v1" isPhysical onPreview={onPreview} />
      </MockedProvider>,
    );

  it('asks for the projection at the fewest guests too, and shows the take-home as a range', async () => {
    panel(3200.5);
    // Only the variables with the minimum resolve, so the range proves what was sent.
    expect(await screen.findByTestId('price-panel-earnings-range-value')).toHaveTextContent('₹3,200.50 – ₹20,742.71');
    expect(screen.getByTestId('price-panel-earnings-range')).toHaveTextContent(
      'From 8 guests, the fewest the venue is paid for, up to all 30 spots.',
    );
    expect(screen.queryByTestId('price-panel-earnings-range-low')).not.toBeInTheDocument();
  });

  it('warns when the fewest guests would not cover the venue — without blocking the pod', async () => {
    let latest: EarningsPreview | null = null;
    panel(-450, (preview) => {
      latest = preview;
    });
    expect(await screen.findByTestId('price-panel-earnings-range-low')).toHaveTextContent(
      'With only 8 guests this pod would not cover the venue.',
    );
    expect(screen.getByTestId('price-panel-earnings-range-value')).toHaveTextContent('₹-450.00 – ₹20,742.71');
    // The server judges a pod at all its spots, so the low end blocks nothing.
    expect(latest).toMatchObject({ zeroEarnings: false, blocked: false });
  });
});
