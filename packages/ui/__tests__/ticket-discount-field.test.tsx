import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { TicketDiscountLabels, TicketDiscountTier } from '@duncit/utils';
import { TicketDiscountField } from '../src/ticket-discount';
import type { TicketDiscountFieldErrors } from '../src/ticket-discount';

const LABELS: TicketDiscountLabels = {
  title: 'Multi-ticket discount',
  switchLabel: 'Offer a discount when one person books multiple tickets',
  hint: 'The best matching tier applies to the ticket price.',
  baseRow: '1 ticket · 0% (full price)',
  ticketsLabel: 'Tickets',
  discountLabel: 'Discount %',
  addTier: 'Add tier',
  removeTier: 'Remove tier',
  maxHint: (max) => `Up to ${max}% off`,
  perTicket: (price) => `${price} per ticket`,
  errors: {
    TIERS_REQUIRED: () => 'Add at least one discount tier',
    TOO_MANY_TIERS: ({ maxTiers }) => `You can add up to ${maxTiers} tiers`,
    TICKETS_MIN: () => 'Tickets must be a whole number of at least 2',
    TICKETS_MAX: ({ maxTickets }) => `Tickets can’t be more than ${maxTickets}`,
    TICKETS_NOT_INCREASING: () => 'Needs more tickets than the row above',
    PCT_MIN: () => 'Discount must be a whole number of at least 1%',
    PCT_MAX: ({ maxPct }) => `Discount can’t be more than ${maxPct}%`,
    PCT_NOT_INCREASING: () => 'Needs a bigger discount than the row above',
  },
};

const TWO_TIERS: TicketDiscountTier[] = [
  { min_tickets: 2, discount_pct: 10 },
  { min_tickets: 4, discount_pct: 20 },
];

type HarnessProps = Readonly<{
  initialEnabled?: boolean;
  initialTiers?: TicketDiscountTier[];
  onTiersChange?: (tiers: TicketDiscountTier[]) => void;
}>;

/** A form stand-in that owns the values, so the field is exercised the way a surface mounts it. */
function Harness({ initialEnabled = false, initialTiers = [], onTiersChange }: HarnessProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [tiers, setTiers] = useState(initialTiers);
  return (
    <TicketDiscountField
      enabled={enabled}
      tiers={tiers}
      onEnabledChange={setEnabled}
      onTiersChange={(next) => {
        onTiersChange?.(next);
        setTiers(next);
      }}
      maxPct={50}
      maxTickets={7}
      labels={LABELS}
    />
  );
}

const switchInput = () => within(screen.getByTestId('ticket-discount-switch')).getByRole('switch');

describe('TicketDiscountField — the switch', () => {
  it('renders the heading, switch and hint, with no tier list while off', () => {
    render(<Harness />);
    expect(screen.getByTestId('ticket-discount-field')).toBeInTheDocument();
    expect(screen.getByText('Multi-ticket discount')).toBeInTheDocument();
    expect(screen.getByText('Offer a discount when one person books multiple tickets')).toBeInTheDocument();
    expect(screen.getByText('The best matching tier applies to the ticket price.')).toBeInTheDocument();
    expect(switchInput()).not.toBeChecked();
    expect(screen.queryByTestId('ticket-discount-base-row')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ticket-discount-add-tier')).not.toBeInTheDocument();
  });

  it('turning it on with no tiers seeds the suggested first tier under the locked base row', () => {
    const onEnabledChange = vi.fn();
    const onTiersChange = vi.fn();
    render(
      <TicketDiscountField
        enabled={false}
        tiers={[]}
        onEnabledChange={onEnabledChange}
        onTiersChange={onTiersChange}
        maxPct={50}
        maxTickets={7}
        labels={LABELS}
      />,
    );
    fireEvent.click(switchInput());
    expect(onEnabledChange).toHaveBeenCalledWith(true);
    expect(onTiersChange).toHaveBeenCalledWith([{ min_tickets: 2, discount_pct: 5 }]);
  });

  it('turning it on keeps tiers that are already there', () => {
    const onEnabledChange = vi.fn();
    const onTiersChange = vi.fn();
    render(
      <TicketDiscountField
        enabled={false}
        tiers={TWO_TIERS}
        onEnabledChange={onEnabledChange}
        onTiersChange={onTiersChange}
        maxPct={50}
        maxTickets={7}
        labels={LABELS}
      />,
    );
    fireEvent.click(switchInput());
    expect(onEnabledChange).toHaveBeenCalledWith(true);
    expect(onTiersChange).not.toHaveBeenCalled();
  });

  it('turning it off clears every tier', () => {
    const onTiersChange = vi.fn();
    render(<Harness initialEnabled initialTiers={TWO_TIERS} onTiersChange={onTiersChange} />);
    expect(screen.getByTestId('ticket-discount-tier-1')).toBeInTheDocument();
    fireEvent.click(switchInput());
    expect(onTiersChange).toHaveBeenCalledWith([]);
    expect(switchInput()).not.toBeChecked();
    expect(screen.queryByTestId('ticket-discount-tier-0')).not.toBeInTheDocument();
  });
});

describe('TicketDiscountField — the tier rows', () => {
  it('shows the base row and each tier with its tickets, discount and max hint', () => {
    render(<Harness initialEnabled initialTiers={TWO_TIERS} />);
    expect(screen.getByTestId('ticket-discount-base-row')).toHaveTextContent('1 ticket · 0% (full price)');
    expect(screen.getByTestId('ticket-discount-tier-min-0')).toHaveValue(2);
    expect(screen.getByTestId('ticket-discount-tier-pct-0')).toHaveValue(10);
    expect(screen.getByTestId('ticket-discount-tier-min-1')).toHaveValue(4);
    expect(screen.getByTestId('ticket-discount-tier-pct-1')).toHaveValue(20);
    expect(screen.getByTestId('ticket-discount-tier-min-1')).toHaveAttribute('max', '7');
    expect(screen.getByTestId('ticket-discount-tier-pct-1')).toHaveAttribute('max', '50');
    expect(screen.getAllByText('Up to 50% off')).toHaveLength(2);
    expect(screen.queryByText(/per ticket/)).not.toBeInTheDocument();
  });

  it('adds the suggested next tier after the last one', () => {
    const onTiersChange = vi.fn();
    render(<Harness initialEnabled initialTiers={TWO_TIERS} onTiersChange={onTiersChange} />);
    fireEvent.click(screen.getByTestId('ticket-discount-add-tier'));
    expect(onTiersChange).toHaveBeenLastCalledWith([...TWO_TIERS, { min_tickets: 5, discount_pct: 25 }]);
    expect(screen.getByTestId('ticket-discount-tier-min-2')).toHaveValue(5);
  });

  it('edits one tier and leaves the others alone, storing a cleared input as 0', () => {
    const onTiersChange = vi.fn();
    render(<Harness initialEnabled initialTiers={TWO_TIERS} onTiersChange={onTiersChange} />);
    fireEvent.change(screen.getByTestId('ticket-discount-tier-min-1'), { target: { value: '5' } });
    expect(onTiersChange).toHaveBeenLastCalledWith([TWO_TIERS[0], { min_tickets: 5, discount_pct: 20 }]);
    fireEvent.change(screen.getByTestId('ticket-discount-tier-pct-0'), { target: { value: '15' } });
    expect(onTiersChange).toHaveBeenLastCalledWith([
      { min_tickets: 2, discount_pct: 15 },
      { min_tickets: 5, discount_pct: 20 },
    ]);
    fireEvent.change(screen.getByTestId('ticket-discount-tier-pct-0'), { target: { value: '' } });
    expect(onTiersChange).toHaveBeenLastCalledWith([
      { min_tickets: 2, discount_pct: 0 },
      { min_tickets: 5, discount_pct: 20 },
    ]);
  });

  it('removes a tier and the rows below keep their own inputs', () => {
    const onTiersChange = vi.fn();
    render(
      <Harness
        initialEnabled
        initialTiers={[...TWO_TIERS, { min_tickets: 6, discount_pct: 30 }]}
        onTiersChange={onTiersChange}
      />,
    );
    const lastInput = screen.getByTestId('ticket-discount-tier-min-2');
    fireEvent.click(screen.getByTestId('ticket-discount-tier-remove-0'));
    expect(onTiersChange).toHaveBeenLastCalledWith([
      { min_tickets: 4, discount_pct: 20 },
      { min_tickets: 6, discount_pct: 30 },
    ]);
    expect(screen.queryByTestId('ticket-discount-tier-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('ticket-discount-tier-min-1')).toBe(lastInput);
    expect(screen.getAllByRole('button', { name: 'Remove tier' })).toHaveLength(2);
  });

  it('disables Add tier once the ladder holds the maximum number of tiers', () => {
    const tiers = Array.from({ length: 10 }, (_, i) => ({ min_tickets: i + 2, discount_pct: i + 1 }));
    render(<Harness initialEnabled initialTiers={tiers} />);
    expect(screen.getByTestId('ticket-discount-add-tier')).toBeDisabled();
  });

  it('shows the per-ticket price of each tier when a unit price and formatter are given', () => {
    const { rerender } = render(
      <TicketDiscountField
        enabled
        tiers={TWO_TIERS}
        onEnabledChange={vi.fn()}
        onTiersChange={vi.fn()}
        maxPct={50}
        maxTickets={7}
        labels={LABELS}
        unitPrice={499}
        formatPrice={(amount) => `₹${amount}`}
      />,
    );
    expect(screen.getByText('₹449.1 per ticket')).toBeInTheDocument();
    expect(screen.getByText('₹399.2 per ticket')).toBeInTheDocument();
    rerender(
      <TicketDiscountField
        enabled
        tiers={TWO_TIERS}
        onEnabledChange={vi.fn()}
        onTiersChange={vi.fn()}
        maxPct={50}
        maxTickets={7}
        labels={LABELS}
        unitPrice={499}
      />,
    );
    expect(screen.queryByText(/per ticket/)).not.toBeInTheDocument();
  });
});

describe('TicketDiscountField — errors and disabled', () => {
  const renderWith = (errors: TicketDiscountFieldErrors | undefined, disabled?: boolean) =>
    render(
      <TicketDiscountField
        enabled
        tiers={TWO_TIERS}
        onEnabledChange={vi.fn()}
        onTiersChange={vi.fn()}
        maxPct={50}
        maxTickets={7}
        labels={LABELS}
        errors={errors}
        disabled={disabled}
      />,
    );

  it('puts row errors under their own fields, replacing the max hint', () => {
    renderWith({
      rows: [
        undefined,
        { min_tickets: 'Needs more tickets than the row above', discount_pct: 'Discount can’t be more than 50%' },
      ],
    });
    expect(screen.getByText('Needs more tickets than the row above')).toHaveClass('Mui-error');
    expect(screen.getByText('Discount can’t be more than 50%')).toHaveClass('Mui-error');
    expect(screen.getAllByText('Up to 50% off')).toHaveLength(1);
    expect(screen.queryByTestId('ticket-discount-list-error')).not.toBeInTheDocument();
  });

  it('shows the list error below the tiers', () => {
    renderWith({ list: 'You can add up to 10 tiers' });
    expect(screen.getByTestId('ticket-discount-list-error')).toHaveTextContent('You can add up to 10 tiers');
    expect(screen.getAllByText('Up to 50% off')).toHaveLength(2);
  });

  it('locks every control when disabled', () => {
    renderWith(undefined, true);
    expect(switchInput()).toBeDisabled();
    expect(screen.getByTestId('ticket-discount-tier-min-0')).toBeDisabled();
    expect(screen.getByTestId('ticket-discount-tier-pct-0')).toBeDisabled();
    expect(screen.getByTestId('ticket-discount-tier-remove-0')).toBeDisabled();
    expect(screen.getByTestId('ticket-discount-add-tier')).toBeDisabled();
  });
});
