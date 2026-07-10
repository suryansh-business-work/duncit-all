import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { addDays } from 'date-fns';
import { AvailabilityCalendar } from '@duncit/availability-calendar';

afterEach(cleanup);

const noSlots: never[] = [];
const inWindow = () => addDays(new Date(), 60);

describe('AvailabilityCalendar 60-day booking window', () => {
  it('disables days beyond maxDate and ignores clicks on them', () => {
    const onSelect = vi.fn();
    render(
      <AvailabilityCalendar
        month={addDays(new Date(), 90)}
        view="day"
        slots={noSlots}
        selectedDate={null}
        onSelect={onSelect}
        maxDate={inWindow()}
      />,
    );
    const cell = screen.getByRole('button');
    expect(cell.getAttribute('aria-disabled')).toBe('true');
    expect(cell.getAttribute('tabindex')).toBe('-1');
    fireEvent.click(cell);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('keeps days within the window selectable', () => {
    const onSelect = vi.fn();
    render(
      <AvailabilityCalendar
        month={addDays(new Date(), 3)}
        view="day"
        slots={noSlots}
        selectedDate={null}
        onSelect={onSelect}
        maxDate={inWindow()}
      />,
    );
    const cell = screen.getByRole('button');
    expect(cell.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(cell);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('leaves far-future days selectable when no maxDate is set (unbounded)', () => {
    const onSelect = vi.fn();
    render(
      <AvailabilityCalendar
        month={addDays(new Date(), 400)}
        view="day"
        slots={noSlots}
        selectedDate={null}
        onSelect={onSelect}
      />,
    );
    const cell = screen.getByRole('button');
    expect(cell.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(cell);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
