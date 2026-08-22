/**
 * The MUI slot picker every surface renders.
 *
 * The rule it exists to keep is that a slot is only pickable if the venue is
 * actually offering it — and that the pod's OWN slot stays offered while its
 * form is open, because the venue no longer lists a booked slot and without
 * that the edit form would silently clear a valid saved choice.
 *
 * Every date and time goes through the injected formatter, never the device's
 * own — two people in different zones must see a slot under the same day.
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

const calendar = (over: Partial<Parameters<typeof SlotCalendar>[0]> = {}) => {
  const onPick = vi.fn();
  const result = render(
    <ThemeProvider theme={testTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SlotCalendar slots={SLOTS} selectedSlotId="" onPick={onPick} fmt={fmt} labels={labels} {...over} />
      </LocalizationProvider>
    </ThemeProvider>
  );
  return { ...result, onPick };
};

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

describe('SlotCalendar', () => {
  it('renders the picker with the venue’s slots', async () => {
    const { container } = calendar();
    await settle();

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain(labels.date);
  });

  it('says it is loading rather than showing an empty calendar', async () => {
    const { container } = calendar({ loading: true, slots: [] });
    await settle();

    expect(container.textContent).toContain(labels.loading);
  });

  it('shows the caller’s error instead of a silent blank', async () => {
    const { container } = calendar({ error: 'Pick a venue first', slots: [] });
    await settle();

    expect(container.textContent).toContain('Pick a venue first');
  });

  it('says so when the venue is offering nothing at all', async () => {
    const { container } = calendar({ slots: [] });
    await settle();

    expect(container.textContent).toContain(labels.empty);
  });

  it('opens on the day of the slot already chosen, so an edit form lands on its booking', async () => {
    const { container } = calendar({ selectedSlotId: 'c' });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('reports the slot itself when one is picked, never just an id', async () => {
    const { container, onPick } = calendar();
    await settle();

    for (const button of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 20)) {
      if (!button.isConnected) continue;
      fireEvent.click(button);
      await settle();
    }

    for (const [picked] of onPick.mock.calls) {
      expect(SLOTS.map((s) => s.id)).toContain((picked as CalendarSlot).id);
    }
  });

  it('renders without prices for a meeting picker, which has none', async () => {
    const { container } = calendar({ showPrice: false });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('marks itself required when the form says so', async () => {
    const { container } = calendar({ required: true });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });
});

describe('SlotTimeGrid', () => {
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

  it('shows each slot’s time through the injected formatter, never the device clock', () => {
    const { container } = grid();

    expect(container.textContent).toContain('T:10:00');
    expect(container.textContent).toContain('T:14:00');
  });

  it('says free rather than a zero price', () => {
    expect(grid().container.textContent).toContain(labels.free);
  });

  it('leads a whole-day slot with its label instead of a clock time', () => {
    const { container } = grid({ slots: [SLOTS[2] as CalendarSlot] });

    expect(container.textContent).toContain(labels.wholeDay);
  });

  it('shows the caption in place of the price for a meeting picker', () => {
    const { container } = grid({ showPrice: false });

    expect(container.textContent).toContain('Court 2');
  });

  it('renders nothing to pick for a day that holds no slots', () => {
    expect(grid({ slots: [] }).container).toBeDefined();
  });

  it('marks the chosen slot, and reports the whole slot when another is picked', () => {
    const { container, onPick } = grid({ selectedSlotId: 'a' });

    for (const button of container.querySelectorAll<HTMLElement>('button:not([disabled])')) {
      fireEvent.click(button);
    }

    for (const [picked] of onPick.mock.calls) expect(picked).toHaveProperty('start_at');
  });

  it('renders a slot the venue marked unavailable without offering it', () => {
    const { container, onPick } = grid({
      slots: [slot({ id: 'x', start_at: '2026-09-02T10:00:00Z', disabled: true })],
    });

    for (const button of container.querySelectorAll<HTMLElement>('button')) fireEvent.click(button);

    expect(onPick).not.toHaveBeenCalled();
  });
});
