import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EarningsProjection from '../../src/components/EarningsProjection';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormValues } from '../../src/types';

// The projection reads the server waterfall through a debounced useQuery.
const apollo = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
  useQuery: () => ({ data: apollo.data, loading: false, error: undefined }),
}));

const FINANCE = { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' };

afterEach(() => {
  apollo.data = undefined;
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
    renderProjection({ pod_type: 'NATIVE_PAID', pod_amount: '' as unknown as number, no_of_spots: 10 });

    expect(screen.getByText(/Enter a ticket price and at least 2 spots/)).toBeInTheDocument();
  });

  it('asks for a price when the spots box is empty too', () => {
    renderProjection({
      pod_type: 'NATIVE_PAID',
      pod_amount: 500,
      no_of_spots: '' as unknown as number,
    });

    expect(screen.getByText(/Enter a ticket price and at least 2 spots/)).toBeInTheDocument();
  });

  it('projects once both boxes carry numbers', () => {
    renderProjection({ pod_type: 'NATIVE_PAID', pod_amount: 500, no_of_spots: 10 });

    expect(screen.getByText('Projecting…')).toBeInTheDocument();
  });
});
