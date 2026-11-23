import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EarningsProjection from '../../src/components/EarningsProjection';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormValues } from '../../src/types';

// The projection reads the server waterfall through a debounced useQuery.
const apollo = vi.hoisted(() => ({
  data: undefined as unknown,
  error: undefined as unknown,
  refetch: vi.fn(() => Promise.resolve()),
  options: [] as Array<{ skip?: boolean }>,
}));
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: (_query: unknown, options: { skip?: boolean }) => {
    apollo.options.push(options);
    return { data: apollo.data, loading: false, error: apollo.error, refetch: apollo.refetch };
  },
}));

const FINANCE = { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' };

// ₹100 × 9 payable seats on a virtual pod, at today's default rates.
const WATERFALL = {
  amount: 900,
  gst_pct: 18,
  gst_amount: 137.29,
  net_amount: 762.71,
  platform_fee_pct: 10,
  platform_fee_amount: 76.27,
  pool_amount: 686.44,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 0,
  venue_commission_pct: 0,
  venue_commission_amount: 0,
  venue_receives: 0,
  host_amount: 686.44,
  host_commission_pct: 5,
  host_commission_amount: 34.32,
  host_receives: 652.12,
  host_earn_pct: 72.46,
};

const projectionWith = (verdict: Record<string, unknown>) => ({
  adminPotentialPodEarnings: {
    total_spots: 10,
    payable_spots: 9,
    venue_budget: 650,
    viable: true,
    viability_reason: null,
    minimum_viable_ticket_price: 12,
    venue_min_business: 0,
    waterfall: WATERFALL,
    ...verdict,
  },
});

afterEach(() => {
  apollo.data = undefined;
  apollo.error = undefined;
  apollo.options = [];
  apollo.refetch.mockClear();
});

function renderProjection(defaults: Partial<PodFormValues> = {}, productCost = 0) {
  render(
    <Harness
      data={makeData({ config: makeConfig({ showFinance: true }), finance: FINANCE })}
      defaultValues={defaults}
    >
      <EarningsProjection productCost={productCost} />
    </Harness>,
  );
}

const paid = { pod_type: 'PAID', pod_mode: 'VIRTUAL', pod_amount: 100, no_of_spots: 10 } as const;

describe('EarningsProjection', () => {
  // PaymentSection only mounts this once a price is typed, but the panel is its
  // own unit: an unset or half-typed number box must read as zero rather than
  // sending NaN down to the projection query.
  it('asks for a price rather than projecting one when the amount is not a number', () => {
    renderProjection({ pod_type: 'PAID', pod_amount: '' as unknown as number, no_of_spots: 10 });

    expect(screen.getByText(/Enter a ticket price and at least 2 spots/)).toBeInTheDocument();
  });

  it('asks for a price when the spots box is empty too', () => {
    renderProjection({
      pod_type: 'PAID',
      pod_amount: 500,
      no_of_spots: '' as unknown as number,
    });

    expect(screen.getByText(/Enter a ticket price and at least 2 spots/)).toBeInTheDocument();
  });

  it('projects once both boxes carry numbers', () => {
    renderProjection({ pod_type: 'PAID', pod_amount: 500, no_of_spots: 10 });

    expect(screen.getByText('Projecting…')).toBeInTheDocument();
    expect(apollo.options.at(-1)?.skip).toBe(false);
  });

  // A free pod collects nothing: no host earning, no venue take, no fee rows —
  // and the server is not even asked, whatever amount the form still holds.
  it('draws nothing and never sends the projection query for a free pod', () => {
    apollo.data = {
      adminPotentialPodEarnings: { total_spots: 10, payable_spots: 9, venue_budget: 100, waterfall: {} },
    };
    renderProjection({ pod_type: 'FREE', pod_amount: 500, no_of_spots: 10, venue_slot_id: 's1' });

    expect(screen.queryByTestId('earnings-projection')).not.toBeInTheDocument();
    expect(screen.queryByText(/Host receives|Venue Slot Price|Total collection/)).not.toBeInTheDocument();
    expect(apollo.options.length).toBeGreaterThan(0);
    expect(apollo.options.every((options) => options.skip === true)).toBe(true);
  });

  it("names the venue's minimum business and the lowest ticket price when the server refuses the pod", () => {
    apollo.data = projectionWith({
      viable: false,
      viability_reason: 'BELOW_MIN_BUSINESS',
      minimum_viable_ticket_price: 124,
      venue_min_business: 1000,
    });
    renderProjection(paid);

    const alert = screen.getByTestId('earnings-viability');
    expect(alert).toHaveAttribute('data-reason', 'BELOW_MIN_BUSINESS');
    expect(alert).toHaveTextContent("Below the venue's minimum business");
    expect(alert).toHaveTextContent("The venue's minimum business is ₹1,000.00.");
    expect(alert).toHaveTextContent('The lowest ticket price that works is ₹124.00.');
  });

  it('says when no ticket price covers the venue', () => {
    apollo.data = projectionWith({ viable: false, viability_reason: 'VENUE_NOT_COVERED', minimum_viable_ticket_price: null });
    renderProjection(paid);

    const alert = screen.getByTestId('earnings-viability');
    expect(alert).toHaveTextContent('The pod does not cover the venue');
    expect(alert).toHaveTextContent('Raise the ticket price or the number of spots.');
    expect(alert).not.toHaveTextContent('lowest ticket price');
  });

  it('words a ₹0 payout once, from the verdict, never twice', () => {
    apollo.data = projectionWith({
      viable: false,
      viability_reason: 'NO_EARNINGS',
      minimum_viable_ticket_price: null,
      waterfall: { ...WATERFALL, host_receives: 0 },
    });
    renderProjection(paid);

    expect(screen.getByTestId('earnings-viability')).toHaveTextContent('The host earns nothing at this price');
    expect(screen.queryByTestId('earnings-zero')).not.toBeInTheDocument();
  });

  it('still warns when attached products alone take a viable pod to ₹0 — the verdict leaves them out', () => {
    apollo.data = projectionWith({});
    renderProjection(paid, 5000);

    expect(screen.getByTestId('earnings-zero')).toBeInTheDocument();
    expect(screen.queryByTestId('earnings-viability')).not.toBeInTheDocument();
  });

  it('says the projection failed and asks again on Try again — a second failure stays on screen, not thrown', async () => {
    apollo.error = new Error('Network request failed');
    apollo.refetch.mockRejectedValueOnce(new Error('still down'));
    renderProjection(paid);

    expect(screen.getByTestId('earnings-failed')).toHaveTextContent('Could not project the earnings for this price.');
    expect(screen.queryByText('Projecting…')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('earnings-retry'));
    expect(apollo.refetch).toHaveBeenCalledTimes(1);
    // The rejected refetch is absorbed; the hook's error keeps the alert up.
    await Promise.resolve();
    expect(screen.getByTestId('earnings-failed')).toBeInTheDocument();
  });
});
