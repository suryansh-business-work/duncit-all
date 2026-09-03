import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CalendarLegend from '../src/CalendarLegend';
import CalendarToolbar from '../src/CalendarToolbar';

type Props = Parameters<typeof CalendarToolbar>[0];

function renderToolbar(overrides: Partial<Props> = {}) {
  const props: Props = {
    view: 'month',
    onView: vi.fn(),
    periodLabel: 'August 2026',
    onShift: vi.fn(),
    canGoNext: true,
    onToday: vi.fn(),
    onRecurring: vi.fn(),
    ...overrides,
  };
  render(<CalendarToolbar {...props} />);
  return props;
}

describe('CalendarToolbar', () => {
  it('switches views, but ignores a click on the view already active', () => {
    const { onView } = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Day' }));
    expect(onView).toHaveBeenCalledWith('day');
    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it('pages, jumps to today and opens the recurring dialog', () => {
    const { onShift, onToday, onRecurring } = renderToolbar();
    expect(screen.getByText('August 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onShift).toHaveBeenCalledWith(-1);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onShift).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onToday).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Recurring availability' }));
    expect(onRecurring).toHaveBeenCalledTimes(1);
  });

  it('disables Next at the end of the booking window', () => {
    renderToolbar({ canGoNext: false });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});

describe('CalendarLegend', () => {
  it('explains every badge the day cells can show', () => {
    render(<CalendarLegend />);
    for (const label of ['A — Available', 'P — Pending approval', 'B — Booked', '× — Blocked', 'Leave / Holiday']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
