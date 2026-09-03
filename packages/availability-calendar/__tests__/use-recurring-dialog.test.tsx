import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { addDays, set as setTimeOnDate, startOfDay } from 'date-fns';
import {
  initialRecurringForm,
  newTimeSlot,
  seedSpaces,
  useRecurringDialog,
  type SpaceRow,
} from '../src/recurring/useRecurringDialog';
import { CREATE_VENUE_SLOTS } from '../src/queries';
import type { VenueSpace } from '../src/types';

const VENUE_ID = 'venue-1';

// The generator uses the real clock, so anchor every case on a day that is
// comfortably inside the 60-day publishing window.
const DAY = startOfDay(addDays(new Date(), 5));
const at = (h: number, m: number) =>
  setTimeOnDate(DAY, { hours: h, minutes: m, seconds: 0, milliseconds: 0 }).toISOString();

let activeMocks: MockedResponse[] = [];
let onDone: Mock<() => Promise<void> | void>;

function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={activeMocks}>{children}</MockedProvider>;
}

const createMock = (capture: (v: Record<string, any>) => void): MockedResponse => ({
  request: { query: CREATE_VENUE_SLOTS, variables: () => true },
  result: (variables: Record<string, any>) => {
    capture(variables);
    return {
      data: {
        createVenueSlots: [
          { __typename: 'VenueSlot', id: 'created-1', start_at: at(13, 0), end_at: at(14, 0), price: 399, status: 'AVAILABLE', notes: '' },
        ],
      },
    };
  },
});

const mountHook = (capacityItems: VenueSpace[], venueCapacity = 0, settings: unknown = undefined) =>
  renderHook(({ items }: { items: VenueSpace[] }) => useRecurringDialog(VENUE_ID, settings, items, venueCapacity, onDone), {
    wrapper: Wrapper,
    initialProps: { items: capacityItems },
  });

const HALL_AND_ROOF: VenueSpace[] = [
  { label: 'Hall', capacity: 50 },
  { label: 'Roof', capacity: 20 },
];

beforeEach(() => {
  activeMocks = [];
  onDone = vi.fn<() => Promise<void> | void>();
});

describe('seedSpaces', () => {
  it('turns each named capacity item into a priced, enabled row', () => {
    expect(seedSpaces(HALL_AND_ROOF, 999)).toEqual([
      { label: 'Hall', capacity: 50, price: '399', enabled: true },
      { label: 'Roof', capacity: 20, price: '399', enabled: true },
    ]);
  });

  it('falls back to a single whole-venue row with the rounded venue capacity', () => {
    expect(seedSpaces([], 40.6)).toEqual([{ label: '', capacity: 41, price: '399', enabled: true }]);
  });

  it('never seeds a negative or unknown capacity', () => {
    expect(seedSpaces([], -12)[0].capacity).toBe(0);
    expect(seedSpaces([], Number.NaN)[0].capacity).toBe(0);
  });
});

describe('newTimeSlot', () => {
  it('parses HH:mm into a Date and hands out unique ids', () => {
    const a = newTimeSlot('09:30', '10:45');
    const b = newTimeSlot();
    expect(a.start?.getHours()).toBe(9);
    expect(a.start?.getMinutes()).toBe(30);
    expect(a.end?.getHours()).toBe(10);
    expect(b.start?.getHours()).toBe(13);
    expect(a.id).not.toBe(b.id);
  });
});

describe('initialRecurringForm', () => {
  it('starts on every weekday, one time slot, Skip conflicts and copied spaces', () => {
    const spaces: SpaceRow[] = [{ label: 'Hall', capacity: 50, price: '399', enabled: true }];
    const form = initialRecurringForm(spaces);
    expect(form.weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(form.conflictMode).toBe('SKIP');
    expect(form.startDate).toBeNull();
    expect(form.timeSlots).toHaveLength(1);
    expect(form.spaces[0]).not.toBe(spaces[0]);
    expect(form.spaces[0]).toEqual(spaces[0]);
  });
});

describe('useRecurringDialog state machine', () => {
  it('seeds the form from the venue spaces and reports the missing dates', () => {
    const { result } = mountHook(HALL_AND_ROOF);
    expect(result.current.form.spaces.map((s) => s.label)).toEqual(['Hall', 'Roof']);
    expect(result.current.result.summary.total).toBe(0);
    expect(result.current.result.errors).toContain('pickDates');
    expect(result.current.venueSettings.operating_hours.open).toBe('09:00');
    expect(result.current.venueSettings.rules.max_advance_days).toBe(60);
  });

  it('previews one slot per space once the dates are picked', () => {
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY }));

    expect(result.current.result.errors).toEqual([]);
    expect(result.current.result.summary.total).toBe(2);
    expect(result.current.result.summary.estimatedRevenue).toBe(798);
    expect(result.current.result.summary.bySpace.Hall).toEqual({ count: 1, price: 399, capacity: 50 });
  });

  it('drops disabled spaces and spaces with an empty price from the preview', () => {
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY }));
    act(() =>
      result.current.patch({
        spaces: [
          { label: 'Hall', capacity: 50, price: '399', enabled: false },
          { label: 'Roof', capacity: 20, price: '  ', enabled: true },
        ],
      }),
    );

    expect(result.current.result.summary.total).toBe(0);
    expect(result.current.result.errors).toContain('addSpace');
  });

  it('rounds fractional prices and capacities, and reads unparseable ones as zero', () => {
    const { result } = mountHook([]);
    act(() =>
      result.current.patch({
        startDate: DAY,
        endDate: DAY,
        spaces: [
          { label: 'Hall', capacity: 50.4, price: '399.6', enabled: true },
          { label: 'Roof', capacity: Number.NaN, price: 'abc', enabled: true },
        ],
      }),
    );

    expect(result.current.result.summary.estimatedRevenue).toBe(400);
    expect(result.current.result.summary.bySpace.Hall).toEqual({ count: 1, price: 400, capacity: 50 });
    expect(result.current.result.summary.bySpace.Roof).toEqual({ count: 1, price: 0, capacity: 0 });
  });

  it('honours the venue buffer between adjacent time slots', () => {
    const { result } = mountHook(HALL_AND_ROOF, 0, { rules: { buffer_minutes: 30 } });
    act(() =>
      result.current.patch({
        startDate: DAY,
        endDate: DAY,
        timeSlots: [newTimeSlot('13:00', '14:00'), newTimeSlot('14:10', '15:00')],
      }),
    );

    expect(result.current.result.errors).toContain('bufferGap');
    expect(result.current.result.summary.total).toBe(0);
  });

  it('flags an empty weekday selection', () => {
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY, weekdays: [] }));
    expect(result.current.result.errors).toContain('pickWeekday');
    expect(result.current.result.summary.total).toBe(0);
  });

  it('re-seeds the space rows only when the venue spaces themselves change', () => {
    const { result, rerender } = mountHook(HALL_AND_ROOF);
    act(() =>
      result.current.patch({
        spaces: [
          { label: 'Hall', capacity: 50, price: '750', enabled: true },
          { label: 'Roof', capacity: 20, price: '399', enabled: true },
        ],
      }),
    );

    // The same spaces as a fresh array (a refetched venue) keep the typed price.
    rerender({ items: HALL_AND_ROOF.map((s) => ({ ...s })) });
    expect(result.current.form.spaces[0].price).toBe('750');

    // A different set of spaces replaces the rows.
    rerender({ items: [{ label: 'Court 1', capacity: 4 }] });
    expect(result.current.form.spaces).toEqual([{ label: 'Court 1', capacity: 4, price: '399', enabled: true }]);
  });

  it('resets the edited form back to its seed and clears a live server error', async () => {
    activeMocks = [{ request: { query: CREATE_VENUE_SLOTS, variables: () => true }, error: new Error('Server exploded') }];
    const { result } = mountHook(HALL_AND_ROOF);
    act(() =>
      result.current.patch({ startDate: DAY, endDate: DAY, conflictMode: 'REPLACE', skipHolidays: false }),
    );
    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.serverError).toContain('Server exploded'));

    act(() => result.current.reset());
    expect(result.current.serverError).toBeNull();
    expect(result.current.form.startDate).toBeNull();
    expect(result.current.form.endDate).toBeNull();
    expect(result.current.form.conflictMode).toBe('SKIP');
    expect(result.current.form.skipHolidays).toBe(true);
  });
});

describe('useRecurringDialog submit', () => {
  it('refuses to submit while the config is invalid, without touching the network', async () => {
    const { result } = mountHook(HALL_AND_ROOF);
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });

    expect(ok).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
    // A network call with no mocks would have surfaced an Apollo error here.
    expect(result.current.serverError).toBeNull();
  });

  it('creates the generated slots with the chosen conflict mode and reports them back', async () => {
    let created: Record<string, any> | null = null;
    activeMocks = [createMock((v) => { created = v; })];
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY, conflictMode: 'REPLACE' }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });

    expect(ok).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(created).not.toBeNull();
    expect(created!.input.venue_id).toBe(VENUE_ID);
    expect(created!.input.on_conflict).toBe('REPLACE');
    expect(created!.input.slots).toEqual([
      { start_at: at(13, 0), end_at: at(14, 0), whole_day: false, price: 399, space_label: 'Hall', capacity: 50 },
      { start_at: at(13, 0), end_at: at(14, 0), whole_day: false, price: 399, space_label: 'Roof', capacity: 20 },
    ]);
    expect(result.current.submitting).toBe(false);
  });

  it('surfaces a failing create as a server error', async () => {
    activeMocks = [{ request: { query: CREATE_VENUE_SLOTS, variables: () => true }, error: new Error('Server exploded') }];
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });

    expect(ok).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.serverError).toContain('Server exploded'));
    expect(result.current.submitting).toBe(false);
  });

  it('falls back to the generic sentence when the failure is not an Error', async () => {
    activeMocks = [createMock(() => undefined)];
    onDone = vi.fn<() => Promise<void>>().mockRejectedValue('boom');
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY }));

    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.serverError).toBe('Could not create slots.'));
  });
});
