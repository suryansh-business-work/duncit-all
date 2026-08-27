import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import RangeFilter from '@/pages/dashboard/RangeFilter';
import type { DashboardRange, DateWindow } from '@/pages/dashboard/dashboardConfig';

const wrap = (range: DashboardRange, onRange = vi.fn(), onCustom = vi.fn(), custom: DateWindow = {}) =>
  render(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <RangeFilter
        range={range}
        custom={custom}
        onRangeChange={onRange}
        onCustomChange={onCustom}
      />
    </LocalizationProvider>
  );

describe('RangeFilter', () => {
  it('renders all preset range buttons', () => {
    wrap('today');
    for (const label of ['Today', 'This week', 'This month', 'This year', 'All time', 'Custom']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('calls onRangeChange when a different range is clicked', () => {
    const onRange = vi.fn();
    wrap('today', onRange);
    fireEvent.click(screen.getByText('This month'));
    expect(onRange).toHaveBeenCalledWith('month');
  });

  it('does not fire onRangeChange when the active button is re-clicked (toggle off → null)', () => {
    const onRange = vi.fn();
    wrap('today', onRange);
    fireEvent.click(screen.getByRole('button', { name: 'today' }));
    expect(onRange).not.toHaveBeenCalled();
  });

  it('shows the From/To pickers only when the range is "custom"', () => {
    const { rerender } = wrap('today');
    expect(screen.queryByRole('group', { name: 'From' })).toBeNull();
    rerender(
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <RangeFilter range="custom" custom={{}} onRangeChange={vi.fn()} onCustomChange={vi.fn()} />
      </LocalizationProvider>
    );
    // MUI X labels a date field twice — the visible <label> is tied to the
    // hidden input, and the editable sections sit in a role="group" that points
    // at the same label — so the field is queried by its group, not by a
    // label lookup that now matches both nodes.
    expect(screen.getByRole('group', { name: 'From' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'To' })).toBeTruthy();
  });
});
