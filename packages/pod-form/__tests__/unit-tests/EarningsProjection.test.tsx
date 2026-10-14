import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EarningsProjection from '../../src/components/EarningsProjection';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormValues } from '../../src/types';

// The projection reads the server waterfall through a debounced useQuery.
const apollo = vi.hoisted(() => ({ data: undefined as unknown, options: [] as Array<{ skip?: boolean }> }));
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: (_query: unknown, options: { skip?: boolean }) => {
    apollo.options.push(options);
    return { data: apollo.data, loading: false, error: undefined };
  },
}));

const FINANCE = { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' };

afterEach(() => {
  apollo.data = undefined;
  apollo.options = [];
});

function renderProjection(defaults: Partial<PodFormValues> = {}) {
  render(
    <Harness
      data={makeData({ config: makeConfig({ showFinance: true }), finance: FINANCE })}
      defaultValues={defaults}
    >
      <EarningsProjection productCost={0} />
    </Harness>,
  );
}

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
});
