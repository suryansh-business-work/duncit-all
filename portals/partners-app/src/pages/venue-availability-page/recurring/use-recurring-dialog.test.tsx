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
  type CapacityItem,
  type SpaceRow,
} from './useRecurringDialog';
import { CREATE_VENUE_SLOTS } from './recurring.queries';
import { DELETE_VENUE_SLOT, VENUE_SLOTS } from '../queries';

const VENUE_ID = 'venue-1';

// The generator uses the real clock, so anchor every case on a day that is
// comfortably inside the 60-day publishing window.
const DAY = startOfDay(addDays(new Date(), 5));
const at = (h: number, m: number) =>
  setTimeOnDate(DAY, { hours: h, minutes: m, seconds: 0, milliseconds: 0 }).toISOString();

let activeMocks: MockedResponse[] = [];
let onDone: Mock<[], void>;

function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={activeMocks}>{children}</MockedProvider>;
}

interface ExistingRow {
  id: string;
  status: string;
  space_label: string;
  start_at?: string;
  end_at?: string;
}

const existingSlot = (row: ExistingRow) => ({
  __typename: 'VenueSlot',
  venue_id: VENUE_ID,
  start_at: at(13, 0),
  end_at: at(14, 0),
  price: 399,
  capacity: 10,
  booked_by_pod_id: null,
  booked_pod_title: null,
  notes: '',
  created_at: at(9, 0),
  ...row,
});

/** The look-up the hook runs before creating: [startDate, endDate + 1 day]. */
const slotsLookupMock = (rows: unknown[]): MockedResponse => ({
  request: {
    query: VENUE_SLOTS,
    variables: {
      venue_id: VENUE_ID,
      from: DAY.toISOString(),
      to: addDays(DAY, 1).toISOString(),
    },
  },
  result: { data: { venueSlots: rows } },
});

const deleteMock = (slotId: string): MockedResponse => ({
  request: { query: DELETE_VENUE_SLOT, variables: { slot_id: slotId } },
  result: { data: { deleteVenueSlot: true } },
});

const createMock = (capture: (v: Record<string, any>) => void): MockedResponse => ({
  request: { query: CREATE_VENUE_SLOTS, variables: () => true },
  result: (variables: Record<string, any>) => {
    capture(variables);
    return { data: { createVenueSlots: [{ __typename: 'VenueSlot', id: 'created-1' }] } };
  },
});

const mountHook = (capacityItems: CapacityItem[], venueCapacity = 0, settings: unknown = undefined) =>
  renderHook(() => useRecurringDialog(VENUE_ID, settings, capacityItems, venueCapacity, onDone), {
    wrapper: Wrapper,
  });

const HALL_AND_ROOF: CapacityItem[] = [
  { label: 'Hall', capacity: 50 },
  { label: 'Roof', capacity: 20 },
];

beforeEach(() => {
  activeMocks = [];
  onDone = vi.fn<[], void>();
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

  it('never seeds a negative capacity', () => {
    expect(seedSpaces([], -12)[0].capacity).toBe(0);
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
    expect(result.current.result.errors).toContain('Pick a start and end date.');
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
    expect(result.current.result.errors).toContain('Add at least one space with a price.');
  });

  it('rounds fractional prices and capacities before previewing', () => {
    const { result } = mountHook([]);
    act(() =>
      result.current.patch({
        startDate: DAY,
        endDate: DAY,
        spaces: [{ label: 'Hall', capacity: 50.4, price: '399.6', enabled: true }],
      }),
    );

    expect(result.current.result.summary.estimatedRevenue).toBe(400);
    expect(result.current.result.summary.bySpace.Hall).toEqual({ count: 1, price: 400, capacity: 50 });
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

    expect(result.current.result.errors).toContain('Keep at least a 30-minute gap between time slots.');
    expect(result.current.result.summary.total).toBe(0);
  });

  it('flags an empty weekday selection', () => {
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY, weekdays: [] }));
    expect(result.current.result.errors).toContain('Select at least one day to repeat on.');
    expect(result.current.result.summary.total).toBe(0);
  });

  it('resets the edited form back to its seed and clears a live server error', async () => {
    activeMocks = [
      slotsLookupMock([]),
      { request: { query: CREATE_VENUE_SLOTS, variables: () => true }, error: new Error('Server exploded') },
    ];
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

  it('creates the generated slots and reports them back', async () => {
    let created: Record<string, any> | null = null;
    activeMocks = [slotsLookupMock([]), createMock((v) => { created = v; })];
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });

    expect(ok).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(created).not.toBeNull();
    expect(created!.input.venue_id).toBe(VENUE_ID);
    expect(created!.input.slots).toEqual([
      { start_at: at(13, 0), end_at: at(14, 0), price: 399, space_label: 'Hall', capacity: 50 },
      { start_at: at(13, 0), end_at: at(14, 0), price: 399, space_label: 'Roof', capacity: 20 },
    ]);
    expect(result.current.submitting).toBe(false);
  });

  it('Skip mode drops every slot that already exists and says so', async () => {
    activeMocks = [
      slotsLookupMock([
        existingSlot({ id: 'e1', status: 'AVAILABLE', space_label: 'Hall' }),
        existingSlot({ id: 'e2', status: 'AVAILABLE', space_label: 'Roof' }),
      ]),
    ];
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });

    expect(ok).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.serverError).toBe('Every matching slot already exists — nothing to add.'),
    );
  });

  it('treats a same-time slot in another space as no conflict', async () => {
    let created: Record<string, any> | null = null;
    activeMocks = [
      slotsLookupMock([existingSlot({ id: 'e1', status: 'AVAILABLE', space_label: 'Basement' })]),
      createMock((v) => { created = v; }),
    ];
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });

    expect(ok).toBe(true);
    expect(created!.input.slots).toHaveLength(2);
  });

  it('keeps a generated slot whose window only touches an existing one', async () => {
    let created: Record<string, any> | null = null;
    activeMocks = [
      slotsLookupMock([
        existingSlot({ id: 'e1', status: 'AVAILABLE', space_label: 'Hall', start_at: at(14, 0), end_at: at(15, 0) }),
        existingSlot({ id: 'e2', status: 'AVAILABLE', space_label: 'Roof', start_at: at(11, 0), end_at: at(13, 0) }),
      ]),
      createMock((v) => { created = v; }),
    ];
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY }));

    await act(async () => {
      await result.current.submit();
    });

    expect(created!.input.slots).toHaveLength(2);
  });

  it('Replace mode deletes the clashing free slot but never a booked one', async () => {
    let created: Record<string, any> | null = null;
    activeMocks = [
      slotsLookupMock([
        existingSlot({ id: 'e1', status: 'AVAILABLE', space_label: 'Hall' }),
        existingSlot({ id: 'e2', status: 'BOOKED', space_label: 'Roof' }),
      ]),
      deleteMock('e1'),
      createMock((v) => { created = v; }),
    ];
    const { result } = mountHook(HALL_AND_ROOF);
    act(() => result.current.patch({ startDate: DAY, endDate: DAY, conflictMode: 'REPLACE' }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });

    // e1 was replaced (its delete mock was consumed — an unmocked delete would
    // have failed the mutation), and the booked Roof slot was left alone.
    expect(ok).toBe(true);
    expect(created!.input.slots).toEqual([
      { start_at: at(13, 0), end_at: at(14, 0), price: 399, space_label: 'Hall', capacity: 50 },
    ]);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failing create as a server error', async () => {
    activeMocks = [
      slotsLookupMock([]),
      { request: { query: CREATE_VENUE_SLOTS, variables: () => true }, error: new Error('Server exploded') },
    ];
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
});
