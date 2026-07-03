import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DayOfWeekPicker from './DayOfWeekPicker';
import PreviewBar from './PreviewBar';
import SpacePricingSection from './SpacePricingSection';
import type { SpaceRow } from './useRecurringDialog';
import type { PreviewSummary } from './recurring.types';

afterEach(cleanup);

describe('DayOfWeekPicker', () => {
  it('applies presets and toggles individual days', () => {
    const onChange = vi.fn();
    render(<DayOfWeekPicker value={[0, 1, 2, 3, 4, 5, 6]} onChange={onChange} />);

    fireEvent.click(screen.getByText('Weekdays'));
    expect(onChange).toHaveBeenLastCalledWith([1, 2, 3, 4, 5]);

    fireEvent.click(screen.getByText('Weekends'));
    expect(onChange).toHaveBeenLastCalledWith([0, 6]);
  });

  it('toggles a single day off', () => {
    const onChange = vi.fn();
    render(<DayOfWeekPicker value={[0, 1]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sunday' }));
    expect(onChange).toHaveBeenLastCalledWith([1]);
  });
});

describe('PreviewBar', () => {
  const summary: PreviewSummary = {
    total: 14,
    bySpace: {
      'Banquet hall': { count: 7, price: 899, capacity: 120 },
      Rooftop: { count: 7, price: 499, capacity: 40 },
    },
    estimatedRevenue: 48378,
    skippedWeeklyOff: 2,
    skippedHolidays: 0,
    skippedPast: 0,
    skippedBeyondCap: 0,
  };

  it('renders the total, per-space breakdown, revenue and skip notice', () => {
    render(<PreviewBar summary={summary} maxAdvanceDays={60} />);
    expect(screen.getByText('14 Slots')).toBeTruthy();
    expect(screen.getByText('₹48,378')).toBeTruthy();
    expect(screen.getByText('Banquet hall')).toBeTruthy();
    expect(screen.getByText('Rooftop')).toBeTruthy();
    expect(screen.getByText(/2 weekly-off/)).toBeTruthy();
  });
});

describe('SpacePricingSection', () => {
  const spaces: SpaceRow[] = [
    { label: 'Banquet hall', capacity: 120, price: '899', enabled: true },
    { label: 'Rooftop', capacity: 40, price: '499', enabled: true },
  ];

  it('prices each space by capacity and toggles inclusion', () => {
    const onChange = vi.fn();
    render(<SpacePricingSection spaces={spaces} onChange={onChange} />);
    expect(screen.getByText('Banquet hall')).toBeTruthy();
    expect(screen.getByText('Capacity 120')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Rooftop price'), { target: { value: '550' } });
    expect(onChange).toHaveBeenLastCalledWith([
      { label: 'Banquet hall', capacity: 120, price: '899', enabled: true },
      { label: 'Rooftop', capacity: 40, price: '550', enabled: true },
    ]);

    fireEvent.click(screen.getByLabelText('Include Banquet hall'));
    expect(onChange).toHaveBeenLastCalledWith([
      { label: 'Banquet hall', capacity: 120, price: '899', enabled: false },
      { label: 'Rooftop', capacity: 40, price: '499', enabled: true },
    ]);
  });
});
