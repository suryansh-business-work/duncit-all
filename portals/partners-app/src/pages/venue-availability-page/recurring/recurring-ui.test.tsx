import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DayOfWeekPicker from './DayOfWeekPicker';
import PreviewBar from './PreviewBar';
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
    total: 7,
    byWeekday: { 0: { count: 1, price: 499 }, 1: { count: 5, price: 399 }, 6: { count: 1, price: 449 } },
    estimatedRevenue: 48378,
    skippedWeeklyOff: 2,
    skippedHolidays: 0,
    skippedPast: 0,
    skippedBeyondCap: 0,
  };

  it('renders the total, per-day breakdown, revenue and skip notice', () => {
    render(<PreviewBar summary={summary} maxAdvanceDays={60} />);
    expect(screen.getByText('7 Slots')).toBeTruthy();
    expect(screen.getByText('₹48,378')).toBeTruthy();
    expect(screen.getByText('Sunday')).toBeTruthy();
    expect(screen.getByText('Saturday')).toBeTruthy();
    expect(screen.getByText(/2 weekly-off/)).toBeTruthy();
  });
});
