import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AvailabilityCalendar from '../src/AvailabilityCalendar';
import { makeSlot } from './fixtures';

describe('AvailabilityCalendar', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('month view grid', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    });

    it('renders weekday header, leading other-month cells, and today highlighted', () => {
      render(
        <AvailabilityCalendar month={new Date(2026, 0, 1)} slots={[]} selectedDate={null} onSelect={vi.fn()} />,
      );
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
      // 4 leading Dec cells (28-31) + 31 Jan cells = 35 total, in chronological order.
      const cells = screen.getAllByRole('button');
      expect(cells).toHaveLength(35);
      // Today (index 18 = Jan 15) is rendered and enabled.
      const today = cells[18];
      expect(within(today).getByText('15')).toBeInTheDocument();
      expect(today).toHaveAttribute('aria-disabled', 'false');
      // A leading other-month day (index 0 = Dec 28) is in the past relative to Jan 15, so disabled.
      const leading = cells[0];
      expect(within(leading).getByText('28')).toBeInTheDocument();
      expect(leading).toHaveAttribute('aria-disabled', 'true');
    });

    it('renders a 6-row (42-cell) grid for a month needing trailing weeks past day 35', () => {
      render(
        <AvailabilityCalendar month={new Date(2026, 4, 1)} slots={[]} selectedDate={null} onSelect={vi.fn()} />,
      );
      expect(screen.getAllByRole('button')).toHaveLength(42);
    });

    it('renders trailing other-month cells that remain selectable when in the future', () => {
      const onSelect = vi.fn();
      vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));
      render(<AvailabilityCalendar month={new Date(2026, 2, 1)} slots={[]} selectedDate={null} onSelect={onSelect} />);
      // March 2026 grid (35 cells) trails into April 1-4 (future, other month, not
      // disabled); index 34 is the last, chronologically final cell (April 4).
      const cells = screen.getAllByRole('button');
      const cell = cells[34];
      expect(within(cell).getByText('4')).toBeInTheDocument();
      expect(cell).toHaveAttribute('aria-disabled', 'false');
      fireEvent.click(cell);
      expect(onSelect).toHaveBeenCalledWith(new Date(2026, 3, 4));
    });

    it('calls onSelect with the clicked date for an enabled cell', () => {
      const onSelect = vi.fn();
      render(<AvailabilityCalendar month={new Date(2026, 0, 1)} slots={[]} selectedDate={null} onSelect={onSelect} />);
      fireEvent.click(screen.getByText('20'));
      expect(onSelect).toHaveBeenCalledWith(new Date(2026, 0, 20));
    });

    it('does not call onSelect when clicking a disabled (past) cell', () => {
      const onSelect = vi.fn();
      render(<AvailabilityCalendar month={new Date(2026, 0, 1)} slots={[]} selectedDate={null} onSelect={onSelect} />);
      fireEvent.click(screen.getByText('10'));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('triggers onSelect on Enter and Space for an enabled cell, but not other keys', () => {
      const onSelect = vi.fn();
      render(<AvailabilityCalendar month={new Date(2026, 0, 1)} slots={[]} selectedDate={null} onSelect={onSelect} />);
      const cell = screen.getByText('20').closest('[role="button"]') as HTMLElement;
      fireEvent.keyDown(cell, { key: 'a' });
      expect(onSelect).not.toHaveBeenCalled();
      fireEvent.keyDown(cell, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(cell, { key: ' ' });
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it('ignores keydown on a disabled cell', () => {
      const onSelect = vi.fn();
      render(<AvailabilityCalendar month={new Date(2026, 0, 1)} slots={[]} selectedDate={null} onSelect={onSelect} />);
      const cell = screen.getByText('10').closest('[role="button"]') as HTMLElement;
      fireEvent.keyDown(cell, { key: 'Enter' });
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('highlights the selected date and still shows its slot badges', () => {
      const slots = [makeSlot({ id: 's1', start_at: '2026-01-20T09:00:00.000Z', status: 'AVAILABLE' })];
      render(
        <AvailabilityCalendar
          month={new Date(2026, 0, 1)}
          slots={slots}
          selectedDate={new Date(2026, 0, 20)}
          onSelect={vi.fn()}
        />,
      );
      const cell = screen.getByText('20').closest('[role="button"]') as HTMLElement;
      expect(within(cell).getByText('1A')).toBeInTheDocument();
    });

    it('marks a holiday date with a LEAVE tag in month view', () => {
      render(
        <AvailabilityCalendar
          month={new Date(2026, 0, 1)}
          slots={[]}
          selectedDate={null}
          onSelect={vi.fn()}
          holidays={['2026-01-20']}
        />,
      );
      const cell = screen.getByText('20').closest('[role="button"]') as HTMLElement;
      expect(within(cell).getByLabelText('Venue on leave')).toHaveTextContent('LEAVE');
    });

    it('disables a day beyond maxDate even though it is in the future', () => {
      render(
        <AvailabilityCalendar
          month={new Date(2026, 0, 1)}
          slots={[]}
          selectedDate={null}
          onSelect={vi.fn()}
          maxDate={new Date(2026, 0, 18)}
        />,
      );
      const withinCap = screen.getByText('18').closest('[role="button"]') as HTMLElement;
      const beyondCap = screen.getByText('20').closest('[role="button"]') as HTMLElement;
      expect(withinCap).toHaveAttribute('aria-disabled', 'false');
      expect(beyondCap).toHaveAttribute('aria-disabled', 'true');
    });

    it('uses default props (month view, no holidays, no maxDate cap) when omitted', () => {
      render(<AvailabilityCalendar month={new Date(2026, 0, 1)} slots={[]} selectedDate={null} onSelect={vi.fn()} />);
      expect(screen.getByText('Sun')).toBeInTheDocument();
      // Index 34 = Jan 31, the last (chronologically final) cell in this 35-cell grid.
      const farFuture = screen.getAllByRole('button')[34];
      expect(within(farFuture).getByText('31')).toBeInTheDocument();
      expect(farFuture).toHaveAttribute('aria-disabled', 'false');
    });

    it('renders per-status slot badges and reuses the same day bucket across multiple slots', () => {
      const slots = [
        makeSlot({ id: 'a1', start_at: '2026-01-10T09:00:00.000Z', status: 'AVAILABLE' }),
        makeSlot({ id: 'a2', start_at: '2026-01-10T14:00:00.000Z', status: 'AVAILABLE' }),
        makeSlot({ id: 'p1', start_at: '2026-01-11T09:00:00.000Z', status: 'PENDING' }),
        makeSlot({ id: 'b1', start_at: '2026-01-12T09:00:00.000Z', status: 'BOOKED' }),
        makeSlot({ id: 'x1', start_at: '2026-01-13T09:00:00.000Z', status: 'BLOCKED' }),
      ];
      render(<AvailabilityCalendar month={new Date(2026, 0, 1)} slots={slots} selectedDate={null} onSelect={vi.fn()} />);
      const day10 = screen.getByText('10').closest('[role="button"]') as HTMLElement;
      const day11 = screen.getByText('11').closest('[role="button"]') as HTMLElement;
      const day12 = screen.getByText('12').closest('[role="button"]') as HTMLElement;
      const day13 = screen.getByText('13').closest('[role="button"]') as HTMLElement;
      expect(within(day10).getByText('2A')).toBeInTheDocument();
      expect(within(day11).getByText('1P')).toBeInTheDocument();
      expect(within(day12).getByText('1B')).toBeInTheDocument();
      expect(within(day13).getByText('1×')).toBeInTheDocument();
    });

    it('renders no badges on a day with no slots', () => {
      render(<AvailabilityCalendar month={new Date(2026, 0, 1)} slots={[]} selectedDate={null} onSelect={vi.fn()} />);
      const day10 = screen.getByText('10').closest('[role="button"]') as HTMLElement;
      expect(within(day10).queryByText(/A|P|B|×/)).not.toBeInTheDocument();
    });
  });

  describe('week view', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    });

    it('renders exactly the 7 days of the anchor date week with a weekday header', () => {
      const onSelect = vi.fn();
      render(
        <AvailabilityCalendar
          month={new Date(2026, 0, 15)}
          view="week"
          slots={[]}
          selectedDate={null}
          onSelect={onSelect}
        />,
      );
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(7);
      fireEvent.click(screen.getByText('16'));
      expect(onSelect).toHaveBeenCalledWith(new Date(2026, 0, 16));
    });
  });

  describe('day view', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    });

    it('renders a single cell with the full date, no weekday header, and no LEAVE tag', () => {
      render(
        <AvailabilityCalendar
          month={new Date(2026, 0, 15)}
          view="day"
          slots={[]}
          selectedDate={null}
          onSelect={vi.fn()}
          holidays={['2026-01-15']}
        />,
      );
      expect(screen.queryByText('Sun')).not.toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(1);
      expect(screen.getByText('Thursday, 15 Jan')).toBeInTheDocument();
      expect(screen.getByText('Venue on leave — not bookable')).toBeInTheDocument();
      expect(screen.queryByLabelText('Venue on leave')).not.toBeInTheDocument();
    });

    it('does not render the holiday notice for a non-holiday day', () => {
      render(
        <AvailabilityCalendar month={new Date(2026, 0, 15)} view="day" slots={[]} selectedDate={null} onSelect={vi.fn()} />,
      );
      expect(screen.queryByText('Venue on leave — not bookable')).not.toBeInTheDocument();
    });
  });
});
