/**
 * What happens when someone actually TOUCHES the picker.
 *
 * The tiles are `role="button"` divs, so both the pointer and the keyboard
 * paths are behavior of this package, not of the browser: a disabled slot must
 * swallow the tap AND the keypress, Space must not scroll the page, and a day
 * whose slots disappear under an open picker must say so instead of rendering
 * a blank grid.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import SlotCalendar from '../src/mui/SlotCalendar';
import SlotTimeGrid from '../src/mui/SlotTimeGrid';
import { mwebSlotLabels } from '../src/labels';
import type { CalendarSlot, SlotFormatter } from '../src/types';

const testTheme = createTheme();
const labels = mwebSlotLabels((key) => key);

/** Fixed to UTC, standing in for `useDateFormat()`. */
const NOW = Date.UTC(2026, 7, 30, 9, 0, 0);
const iso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  return String(value ?? '');
};
const at = (input: unknown) => new Date(iso(input));

const fmt = {
  dayKey: (input: unknown) => (Number.isNaN(at(input).getTime()) ? '' : at(input).toISOString().slice(0, 10)),
  formatDate: (input: unknown) => `D:${at(input).toISOString().slice(0, 10)}`,
  formatTime: (input: unknown) => `T:${at(input).toISOString().slice(11, 16)}`,
  formatPattern: (date: Date) => String(date.getUTCDate()),
  clock: { nowMs: () => NOW },
} as unknown as SlotFormatter & { formatPattern: (input: Date, pattern: string) => string };

const slot = (over: Partial<CalendarSlot> & { id: string; start_at: string }): CalendarSlot => ({ ...over });

const SLOTS: CalendarSlot[] = [
  slot({ id: 'a', start_at: '2026-09-02T10:00:00Z', end_at: '2026-09-02T12:00:00Z', price: 250, caption: 'Court 2' }),
  slot({ id: 'b', start_at: '2026-09-02T14:00:00Z', end_at: '2026-09-02T16:00:00Z', price: 0 }),
  slot({ id: 'c', start_at: '2026-09-05T09:00:00Z', end_at: '2026-09-06T09:00:00Z', whole_day: true }),
];

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('SlotTimeGrid interactions', () => {
  const grid = (over: Partial<Parameters<typeof SlotTimeGrid>[0]> = {}) => {
    const onPick = vi.fn();
    const result = render(
      <ThemeProvider theme={testTheme}>
        <SlotTimeGrid
          slots={SLOTS.slice(0, 2)}
          selectedSlotId=""
          onPick={onPick}
          fmt={fmt}
          freeLabel={labels.free}
          wholeDayLabel={labels.wholeDay}
          showPrice
          {...over}
        />
      </ThemeProvider>
    );
    return { ...result, onPick };
  };

  const tile = (container: HTMLElement, id: string) => {
    const found = container.querySelector<HTMLElement>(`[data-testid="slot-tile-${id}"]`);
    expect(found).toBeTruthy();
    return found as HTMLElement;
  };

  it('reports the whole slot, ₹ price and all, when a tile is tapped', () => {
    const { container, onPick } = grid();

    fireEvent.click(tile(container, 'a'));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(SLOTS[0]);
  });

  it('swallows a tap on a slot the venue marked unavailable', () => {
    const disabledSlot = slot({ id: 'x', start_at: '2026-09-02T10:00:00Z', disabled: true });
    const { container, onPick } = grid({ slots: [disabledSlot] });

    fireEvent.click(tile(container, 'x'));

    expect(onPick).not.toHaveBeenCalled();
  });

  it('picks on Enter, because the tile is a role="button" div and gets no keyboard for free', () => {
    const { container, onPick } = grid();

    fireEvent.keyDown(tile(container, 'b'), { key: 'Enter' });

    expect(onPick).toHaveBeenCalledWith(SLOTS[1]);
  });

  it('picks on Space without letting the page scroll', () => {
    const { container, onPick } = grid();

    const bubbled = fireEvent.keyDown(tile(container, 'a'), { key: ' ' });

    expect(onPick).toHaveBeenCalledWith(SLOTS[0]);
    expect(bubbled).toBe(false); // preventDefault fired — Space must not scroll
  });

  it('ignores every other key', () => {
    const { container, onPick } = grid();

    fireEvent.keyDown(tile(container, 'a'), { key: 'Escape' });
    fireEvent.keyDown(tile(container, 'a'), { key: 'Tab' });

    expect(onPick).not.toHaveBeenCalled();
  });

  it('ignores the keyboard on a disabled slot too', () => {
    const disabledSlot = slot({ id: 'x', start_at: '2026-09-02T10:00:00Z', disabled: true });
    const { container, onPick } = grid({ slots: [disabledSlot] });

    fireEvent.keyDown(tile(container, 'x'), { key: 'Enter' });
    fireEvent.keyDown(tile(container, 'x'), { key: ' ' });

    expect(onPick).not.toHaveBeenCalled();
  });
});

describe('SlotCalendar interactions', () => {
  const ui = (over: Partial<Parameters<typeof SlotCalendar>[0]> = {}) => (
    <ThemeProvider theme={testTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SlotCalendar slots={SLOTS} selectedSlotId="" onPick={vi.fn()} fmt={fmt} labels={labels} {...over} />
      </LocalizationProvider>
    </ThemeProvider>
  );

  it('says the day is empty when its slots vanish under an open picker, not a blank grid', async () => {
    const { container, rerender } = render(ui());
    await settle();

    // Tap 5 September — the whole-day slot's day — so it becomes the override.
    const day5 = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '5' && !button.disabled
    );
    expect(day5).toBeTruthy();
    fireEvent.click(day5 as HTMLButtonElement);
    await settle();
    expect(container.textContent).toContain(labels.wholeDay);

    // An availability refetch drops that day while the picker is open.
    rerender(ui({ slots: SLOTS.slice(0, 2) }));
    await settle();

    expect(container.querySelector('[data-testid="slot-calendar-empty-day"]')).toBeTruthy();
    expect(container.textContent).toContain(labels.emptyDay);
  });

  it('shows the caller’s error under the grid even while slots are on offer', async () => {
    const { container } = render(ui({ error: 'Slot no longer available' }));
    await settle();

    expect(container.querySelector('[data-testid="slot-calendar"]')).toBeTruthy();
    expect(container.textContent).toContain('Slot no longer available');
  });
});
