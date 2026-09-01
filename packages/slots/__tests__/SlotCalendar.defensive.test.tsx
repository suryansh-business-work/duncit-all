/**
 * The calendar's defensive seams around `slotDayBounds`.
 *
 * With real data the bounds can never be null while days exist — both derive
 * from the same grouping — so the guards on `minDate`/`maxDate` (and the blank
 * day-key guard inside `dayKeyToDate`) are unreachable through props alone.
 * They still matter: they are what keeps a bad bounds answer from feeding the
 * MUIX picker an Invalid Date. Exercised here by mocking the sibling module.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../src/group', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/group')>();
  return { ...actual, slotDayBounds: vi.fn(actual.slotDayBounds) };
});

import SlotCalendar from '../src/mui/SlotCalendar';
import { slotDayBounds } from '../src/group';
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

const SLOTS: CalendarSlot[] = [
  { id: 'a', start_at: '2026-09-02T10:00:00Z', end_at: '2026-09-02T12:00:00Z', price: 250, caption: 'Court 2' },
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
  // Unmount FIRST. `globals: false` means Testing Library never sees a global
  // `afterEach` to register its own cleanup in, so every render stays mounted —
  // and React work still queued when the jsdom environment is torn down throws
  // `window is not defined`, which fails the run with every test passing.
  cleanup();
  vi.clearAllMocks();
});

const calendar = () =>
  render(
    <ThemeProvider theme={testTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SlotCalendar slots={SLOTS} selectedSlotId="" onPick={vi.fn()} fmt={fmt} labels={labels} />
      </LocalizationProvider>
    </ThemeProvider>
  );

describe('SlotCalendar without usable day bounds', () => {
  it('renders unclamped rather than crashing when the bounds answer is null', async () => {
    vi.mocked(slotDayBounds).mockReturnValue(null);

    const { container } = calendar();
    await settle();

    expect(container.querySelector('[data-testid="slot-calendar"]')).toBeTruthy();
    expect(container.textContent).toContain('T:10:00'); // the day's slots still offer
  });

  it('clamps nothing when the bounds carry blank day keys, instead of an Invalid Date', async () => {
    vi.mocked(slotDayBounds).mockReturnValue({ first: '', last: '' });

    const { container } = calendar();
    await settle();

    expect(container.querySelector('[data-testid="slot-calendar"]')).toBeTruthy();
    expect(container.textContent).toContain(labels.availableSlots);
  });
});
