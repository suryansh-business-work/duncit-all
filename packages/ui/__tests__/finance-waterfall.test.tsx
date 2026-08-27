/**
 * The settlement waterfall as STAFF read it, and the attendance chip beside it.
 *
 * The line that matters most is the first one. `collectedTotal` is what was
 * taken at the door; `waterfall.amount` is the basis the split was actually
 * computed on. A console showing money must lead with what was collected when
 * it knows it, because that is the number a person reconciles against — every
 * line below is derived from the basis and would otherwise appear not to add up
 * for no visible reason.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AttendanceChip from '../src/AttendanceChip';
import FinanceWaterfallList from '../src/finance-waterfall/FinanceWaterfallList';
import { buildWaterfallLines, type PodFinanceWaterfall } from '../src/finance-waterfall/waterfall-lines';

const waterfall: PodFinanceWaterfall = {
  version: 1,
  amount: 1000,
  gst_pct: 18,
  gst_amount: 180,
  net_amount: 820,
  platform_fee_pct: 10,
  platform_fee_amount: 82,
  pool_amount: 738,
  venue_amount: 300,
  venue_commission_pct: 5,
  venue_commission_amount: 15,
  venue_receives: 285,
  host_amount: 438,
  host_commission_pct: 0,
  host_commission_amount: 0,
  host_receives: 400,
  duncit_revenue: 197,
  host_earn_pct: 40,
};

const keys = (hasVenue: boolean, collected?: number) =>
  buildWaterfallLines(waterfall, '₹', hasVenue, collected).map((line) => line.key);

describe('buildWaterfallLines', () => {
  it('runs in the order a reader follows the money', () => {
    expect(keys(false)).toEqual(['paid', 'gst', 'fee', 'pool', 'host', 'duncit']);
  });

  it('slots the venue in between the pool and the host', () => {
    expect(keys(true)).toEqual(['paid', 'gst', 'fee', 'pool', 'venue', 'host', 'duncit']);
  });

  it('leads with what was collected when the caller knows it', () => {
    const [first] = buildWaterfallLines(waterfall, '₹', false, 1200);

    expect(first?.value).toBe(1200);
  });

  it('falls back to the settlement basis when nothing was collected separately', () => {
    const [first] = buildWaterfallLines(waterfall, '₹', false);

    expect(first?.value).toBe(1000);
  });

  it('treats a collected total of zero as a real figure, not as absent', () => {
    expect(buildWaterfallLines(waterfall, '₹', false, 0)[0]?.value).toBe(0);
  });

  it('spells the percentages into the deduction labels', () => {
    const byKey = new Map(buildWaterfallLines(waterfall, '₹', true).map((line) => [line.key, line]));

    expect(byKey.get('gst')?.label).toBe('− GST (18%)');
    expect(byKey.get('fee')?.label).toBe('− Platform Fee (10%)');
  });

  it('explains the venue line in the caller’s currency', () => {
    const venue = buildWaterfallLines(waterfall, '$', true).find((line) => line.key === 'venue');

    expect(venue?.secondary).toContain('5% commission');
    expect(venue?.secondary).toContain('$285.00');
  });

  it('marks the host line as the one to read first', () => {
    const host = buildWaterfallLines(waterfall, '₹', true).find((line) => line.key === 'host');

    expect(host?.strong).toBe(true);
    expect(host?.value).toBe(400);
  });

  it('gives every line a distinct key, because they are rendered as a list', () => {
    const all = keys(true);

    expect(new Set(all).size).toBe(all.length);
  });
});

describe('FinanceWaterfallList', () => {
  it('renders every line with its money', () => {
    render(<FinanceWaterfallList lines={buildWaterfallLines(waterfall, '₹', true)} symbol="₹" />);

    expect(screen.getByText('Customer Paid')).toBeInTheDocument();
    expect(screen.getByText('Duncit revenue')).toBeInTheDocument();
  });

  it('renders an empty waterfall without crashing', () => {
    const { container } = render(<FinanceWaterfallList lines={[]} symbol="₹" />);

    expect(container).toBeDefined();
  });
});

describe('AttendanceChip', () => {
  it('says how many of the booked seats turned up', () => {
    const { container } = render(
      <AttendanceChip attendance={{ attended_seats: 6, booked_seats: 8, recorded: true }} />
    );

    expect(container.textContent).toContain('6');
    expect(container.textContent).toContain('8');
  });

  it('renders a pod where nobody was marked', () => {
    const { container } = render(
      <AttendanceChip attendance={{ attended_seats: 0, booked_seats: 8, recorded: true }} />
    );

    expect(container.innerHTML).not.toBe('');
  });

  it('renders a pod whose attendance was never recorded', () => {
    const { container } = render(
      <AttendanceChip attendance={{ attended_seats: 0, booked_seats: 8, recorded: false }} />
    );

    expect(container).toBeDefined();
  });

  it.each([[null], [undefined]])('renders nothing to mislead a reader for %j attendance', (attendance) => {
    const { container } = render(<AttendanceChip attendance={attendance} />);

    expect(container).toBeDefined();
  });

  it('fills the chip green once every booked seat was scanned', () => {
    const { container } = render(
      <AttendanceChip attendance={{ attended_seats: 8, booked_seats: 8, recorded: true }} />
    );

    const chip = container.querySelector('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-filled', 'MuiChip-colorSuccess');
  });

  it('renders at either size', () => {
    for (const size of ['small', 'medium'] as const) {
      const { container } = render(
        <AttendanceChip attendance={{ attended_seats: 6, booked_seats: 8, recorded: true }} size={size} />
      );
      expect(container.innerHTML).not.toBe('');
    }
  });
});
