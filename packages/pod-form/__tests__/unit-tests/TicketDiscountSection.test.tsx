import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent, within } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import TicketDiscountSection from '../../src/sections/TicketDiscountSection';
import { Harness, makeData } from './helpers';
import type { PodFormData, PodFormValues } from '../../src/types';

// The admin's ceiling comes off the shared `PublicAppSettings` query. Default:
// it has not answered, so the shipped 50% stands in.
const apollo = vi.hoisted(() => ({
  data: undefined as unknown,
}));
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: apollo.data, loading: false, error: undefined }),
}));

const FINANCE = { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' };

afterEach(() => {
  apollo.data = undefined;
});

const discounted: Partial<PodFormValues> = {
  pod_type: 'NATIVE_PAID',
  pod_amount: 499,
  no_of_spots: 8,
  ticket_discount_enabled: true,
  ticket_discount_tiers: [{ min_tickets: 2, discount_pct: 10 }],
};

function renderSection(defaults: Partial<PodFormValues>, data: PodFormData = makeData({ finance: FINANCE })) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness data={data} defaultValues={defaults} methodsRef={methodsRef}>
      <TicketDiscountSection />
    </Harness>,
  );
  return methodsRef;
}

describe('TicketDiscountSection', () => {
  it('shows each stored tier with what one ticket then costs, to the paisa', () => {
    renderSection(discounted);
    expect(screen.getByTestId('ticket-discount-tier-min-0')).toHaveValue(2);
    expect(screen.getByTestId('ticket-discount-tier-pct-0')).toHaveValue(10);
    expect(screen.getByText('₹449.10 per ticket')).toBeInTheDocument();
    // 8 spots sell 7 tickets — the host's own seat is free.
    expect(screen.getByTestId('ticket-discount-tier-min-0')).toHaveAttribute('max', '7');
  });

  it('caps a tier at the shipped 50% until the settings answer', () => {
    renderSection(discounted);
    expect(screen.getByText('Up to 50% off')).toBeInTheDocument();
  });

  it("caps a tier at the admin's own max", () => {
    apollo.data = { publicAppSettings: { ticket_discount_max_pct: 30 } };
    renderSection(discounted);
    expect(screen.getByText('Up to 30% off')).toBeInTheDocument();
  });

  it('switching the discount on seeds a first tier into the form', () => {
    const ref = renderSection({ pod_type: 'NATIVE_PAID', pod_amount: 499, no_of_spots: 8 });
    fireEvent.click(within(screen.getByTestId('ticket-discount-switch')).getByRole('switch'));
    expect(ref.current?.getValues('ticket_discount_enabled')).toBe(true);
    expect(ref.current?.getValues('ticket_discount_tiers')).toEqual([{ min_tickets: 2, discount_pct: 5 }]);
  });

  it('adds the next tier one ticket and five percent above the last', () => {
    const ref = renderSection(discounted);
    fireEvent.click(screen.getByTestId('ticket-discount-add-tier'));
    expect(ref.current?.getValues('ticket_discount_tiers')).toEqual([
      { min_tickets: 2, discount_pct: 10 },
      { min_tickets: 3, discount_pct: 15 },
    ]);
  });

  it('shows no errors while the resolver has reported none', () => {
    renderSection(discounted);
    expect(screen.queryByTestId('ticket-discount-list-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('ticket-discount-tier-pct-0')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('puts a list-level message under the tiers and a cell message on its own field', async () => {
    const ref = renderSection(discounted);
    await act(async () => {
      ref.current?.setError('ticket_discount_tiers', { type: 'custom', message: 'You can add up to 10 tiers' });
    });
    expect(screen.getByTestId('ticket-discount-list-error')).toHaveTextContent('You can add up to 10 tiers');

    await act(async () => {
      ref.current?.clearErrors();
      ref.current?.setError('ticket_discount_tiers.0.discount_pct', {
        type: 'custom',
        message: 'Discount can’t be more than 50%',
      });
    });
    expect(screen.getByText('Discount can’t be more than 50%')).toBeInTheDocument();
    expect(screen.queryByTestId('ticket-discount-list-error')).not.toBeInTheDocument();
  });

  // The other column of the same row: a tickets message belongs under the
  // tickets box, never under the discount one.
  it('puts a tickets message under the tickets box', async () => {
    const message = 'Tickets can’t be more than 7';
    const ref = renderSection(discounted);
    await act(async () => {
      ref.current?.setError('ticket_discount_tiers.0.min_tickets', { type: 'custom', message });
    });

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByTestId('ticket-discount-list-error')).not.toBeInTheDocument();
  });

  // RHF nests a list-level message under `root` once the array also has cell errors.
  it('reads a list-level message that RHF filed under the array root', async () => {
    const ref = renderSection(discounted);
    await act(async () => {
      // Not a FieldPath in RHF's types, but exactly where its field-array errors put it.
      ref.current?.setError('ticket_discount_tiers.root' as 'ticket_discount_tiers', {
        type: 'custom',
        message: 'Add at least one discount tier',
      });
    });
    expect(screen.getByTestId('ticket-discount-list-error')).toHaveTextContent('Add at least one discount tier');
  });

  // Rendered on its own (PodSections only mounts it on a priced pod), an empty
  // price and spots box still price at zero on an unlimited pod rather than NaN.
  it('prices at zero with the unlimited ticket cap while price and spots are still empty', () => {
    renderSection(
      {
        ...discounted,
        pod_amount: '' as unknown as number,
        no_of_spots: '' as unknown as number,
      },
      makeData(),
    );
    expect(screen.getByText('₹0 per ticket')).toBeInTheDocument();
    expect(screen.getByTestId('ticket-discount-tier-min-0')).toHaveAttribute('max', '10');
  });
});
