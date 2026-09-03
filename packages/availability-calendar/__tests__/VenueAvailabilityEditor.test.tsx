import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  set as setTimeOnDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { formatDate } from '@duncit/datetime';
import VenueAvailabilityEditor, { type EditorVenue } from '../src/VenueAvailabilityEditor';
import {
  CREATE_VENUE_SLOTS,
  DELETE_VENUE_SLOT,
  MY_SLOT_TEMPLATES,
  UPDATE_VENUE_SETTINGS,
  UPDATE_VENUE_SLOT,
  VENUE_SLOTS,
} from '../src/queries';

// Deterministic stand-ins for the MUI X pickers (see DayDrawer.test.tsx).
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, value, onChange }: { label: string; value: Date | null; onChange: (v: Date | null) => void }) => (
    <input
      aria-label={label}
      value={value ? value.toISOString() : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}));
vi.mock('@mui/x-date-pickers/TimePicker', () => ({
  TimePicker: ({ label, value, onChange }: { label: string; value: Date | null; onChange: (v: Date | null) => void }) => (
    <input
      aria-label={label}
      value={value ? value.toISOString() : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}));

const VENUE_ID = 'venue-1';
const NOW = new Date();
const HOLIDAY = format(addDays(NOW, 1), 'yyyy-MM-dd');

const venue = (over: Partial<EditorVenue> = {}): EditorVenue => ({
  id: VENUE_ID,
  status: 'APPROVED',
  venue_name: 'Skyline Banquets',
  capacity: 120,
  capacity_items: [{ label: 'Hall', capacity: 80 }],
  settings: {
    operating_hours: { open: '09:00', close: '23:00' },
    weekly_off_days: [],
    holidays: [HOLIDAY],
    rules: { buffer_minutes: 0, min_notice_minutes: 0, max_advance_days: 60, max_bookings_per_slot: 1 },
    auto_extend: { enabled: false, template_id: null, horizon_days: 30, until: '' },
  },
  ...over,
});

const atHour = (day: Date, hours: number, minutes = 0) =>
  setTimeOnDate(day, { hours, minutes, seconds: 0, milliseconds: 0 }).toISOString();

const slot = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueSlot',
  id: 'slot-1',
  venue_id: VENUE_ID,
  start_at: atHour(NOW, 21),
  end_at: atHour(NOW, 22),
  whole_day: false,
  price: 499,
  space_label: 'Hall',
  capacity: 80,
  status: 'AVAILABLE',
  booked_by_pod_id: null,
  booked_pod_title: null,
  notes: '',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Answers every VenueSlots range (month/week/day + refetches) and records the
 *  variables the editor asked for, so the view range itself can be asserted. */
const slotsMock = (rows: unknown[], seen: Record<string, any>[] = []): MockedResponse => ({
  request: { query: VENUE_SLOTS, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: (variables: Record<string, any>) => {
    seen.push(variables);
    return { data: { venueSlots: rows } };
  },
});

const templatesMock: MockedResponse = {
  request: { query: MY_SLOT_TEMPLATES, variables: { venue_id: VENUE_ID } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { mySlotTemplates: [] } },
};

const capturingMock = (query: MockedResponse['request']['query'], data: unknown, capture: (v: any) => void): MockedResponse => ({
  request: { query, variables: () => true },
  result: (variables: Record<string, any>) => {
    capture(variables);
    return { data } as any;
  },
});

const savedVenue = {
  __typename: 'Venue',
  id: VENUE_ID,
  settings: {
    __typename: 'VenueSettings',
    operating_hours: { __typename: 'VenueOperatingHours', open: '09:00', close: '23:00' },
    weekly_off_days: [],
    holidays: [HOLIDAY],
    rules: {
      __typename: 'VenueRules',
      buffer_minutes: 0,
      min_notice_minutes: 0,
      max_advance_days: 60,
      max_bookings_per_slot: 1,
      allow_instant_booking: true,
      allow_waitlist: false,
      booking_approval_required: false,
      allow_multiple_bookings: false,
    },
    auto_extend: { __typename: 'VenueAutoExtend', enabled: false, template_id: null, horizon_days: 30, until: '' },
  },
};

function renderEditor(mocks: MockedResponse[], props: Partial<Parameters<typeof VenueAvailabilityEditor>[0]> = {}) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <VenueAvailabilityEditor venue={venue()} {...props} />
    </MockedProvider>,
  );
}

const monthLabel = (d: Date) => format(d, 'MMMM yyyy');
/** In day view the toolbar prints the same date as the one cell, so pick the cell. */
const dayCell = (d: Date) =>
  screen
    .getAllByText(formatDate(d))
    .map((el) => el.closest('[role="button"]'))
    .find((el): el is HTMLElement => el instanceof HTMLElement) as HTMLElement;
const weekLabel = (d: Date) =>
  `${format(startOfWeek(d, { weekStartsOn: 0 }), 'dd MMM')} – ${format(endOfWeek(d, { weekStartsOn: 0 }), 'dd MMM')}`;

describe('VenueAvailabilityEditor calendar', () => {
  it('opens on the current month and asks for that month of slots', async () => {
    const seen: Record<string, any>[] = [];
    renderEditor([slotsMock([slot()], seen)]);

    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toEqual({
      venue_id: VENUE_ID,
      from: startOfMonth(NOW).toISOString(),
      to: endOfMonth(NOW).toISOString(),
    });
  });

  it('marks the venue holiday coming from the venue settings', async () => {
    renderEditor([slotsMock([])]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());
    await waitFor(() => expect(screen.getByLabelText('Venue on leave')).toBeTruthy());
  });

  it('switches to the day view and re-queries just that day', async () => {
    const seen: Record<string, any>[] = [];
    renderEditor([slotsMock([], seen)]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Day' }));

    expect(screen.getAllByText(formatDate(NOW)).length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(seen).toContainEqual({
        venue_id: VENUE_ID,
        from: startOfDay(NOW).toISOString(),
        to: endOfDay(NOW).toISOString(),
      }),
    );
  });

  it('switches to the week view and pages a week at a time', async () => {
    const seen: Record<string, any>[] = [];
    renderEditor([slotsMock([], seen)]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Week' }));

    expect(screen.getByText(weekLabel(NOW))).toBeTruthy();
    await waitFor(() =>
      expect(seen).toContainEqual({
        venue_id: VENUE_ID,
        from: startOfWeek(NOW, { weekStartsOn: 0 }).toISOString(),
        to: endOfWeek(NOW, { weekStartsOn: 0 }).toISOString(),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(weekLabel(addDays(NOW, 7)))).toBeTruthy();
  });

  it('steps back a month and returns with Today', async () => {
    renderEditor([slotsMock([])]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText(monthLabel(subMonths(NOW, 1)))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText(monthLabel(NOW))).toBeTruthy();
  });

  it('stops paging forward once the 60-day booking window is exhausted', async () => {
    renderEditor([slotsMock([])]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    const next = () => screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement;
    let advanced = 0;
    while (!next().disabled && advanced < 6) {
      fireEvent.click(next());
      advanced += 1;
    }

    // The window is 60 days, so at most the month after next is reachable.
    expect(next().disabled).toBe(true);
    expect(advanced).toBeGreaterThanOrEqual(1);
    expect(advanced).toBeLessThanOrEqual(2);
    expect(screen.getByText(monthLabel(addMonths(NOW, advanced)))).toBeTruthy();
  });

  it('surfaces a failing slots query', async () => {
    renderEditor([{ request: { query: VENUE_SLOTS, variables: () => true }, error: new Error('Slots are unavailable') }]);
    await waitFor(() => expect(screen.getByText('Slots are unavailable')).toBeTruthy());
  });

  it('opens the recurring availability dialog', async () => {
    renderEditor([slotsMock([]), templatesMock]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());
    expect(screen.queryByText('Create slots with custom timing, pricing and venue settings.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Recurring availability' }));

    expect(screen.getByText('Create slots with custom timing, pricing and venue settings.')).toBeTruthy();
    expect(screen.getByText('Pricing by space')).toBeTruthy();
    // Nothing is generated until dates are picked.
    expect(screen.getByRole('button', { name: 'Create 0 slots' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Create slots with custom timing, pricing and venue settings.')).toBeNull(),
    );
  });
});

describe('VenueAvailabilityEditor refresh', () => {
  const saveAutoExtend = async (seen: Record<string, any>[]) => {
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Recurring availability' }));
    const before = seen.length;
    fireEvent.click(screen.getByRole('button', { name: /Future availability/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save auto-extend' }));
    await waitFor(() => expect(seen).toHaveLength(before + 1));
  };
  const settingsMock = (): MockedResponse => ({
    request: { query: UPDATE_VENUE_SETTINGS, variables: () => true },
    result: { data: { updateVenueSettings: savedVenue } },
  });

  it('reloads the visible range and tells the host once the dialog saves the venue settings', async () => {
    const seen: Record<string, any>[] = [];
    const onVenueChanged = vi.fn();
    renderEditor([slotsMock([], seen), templatesMock, settingsMock()], { onVenueChanged });
    await saveAutoExtend(seen);
    await waitFor(() => expect(onVenueChanged).toHaveBeenCalledTimes(1));
  });

  it('still reloads when the host has nothing to be told', async () => {
    const seen: Record<string, any>[] = [];
    renderEditor([slotsMock([], seen), templatesMock, settingsMock()]);
    await saveAutoExtend(seen);
  });
});

describe('VenueAvailabilityEditor day drawer', () => {
  const openDrawer = async () => {
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Day' }));
    await waitFor(() => expect(dayCell(NOW)).toBeTruthy());
    fireEvent.click(dayCell(NOW));
  };
  const clock = (hours: number, minutes: number) => format(setTimeOnDate(NOW, { hours, minutes }), 'hh:mm a');
  const timeLabel = (from: number, to: number, toMinutes = 0) => `${clock(from, 0)} – ${clock(to, toMinutes)}`;

  it('blocks the picked slot and refreshes the day', async () => {
    let updated: any = null;
    renderEditor([
      slotsMock([slot()]),
      capturingMock(
        UPDATE_VENUE_SLOT,
        { updateVenueSlot: { __typename: 'VenueSlot', id: 'slot-1', start_at: slot().start_at, end_at: slot().end_at, price: 499, status: 'BLOCKED', notes: '' } },
        (v) => { updated = v; },
      ),
    ]);
    await openDrawer();

    await waitFor(() => expect(screen.getByText(timeLabel(21, 22))).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));

    await waitFor(() => expect(updated).toEqual({ slot_id: 'slot-1', input: { block: true } }));
  });

  it('unblocks a blocked slot', async () => {
    let updated: any = null;
    renderEditor([
      slotsMock([slot({ status: 'BLOCKED' })]),
      capturingMock(
        UPDATE_VENUE_SLOT,
        { updateVenueSlot: { __typename: 'VenueSlot', id: 'slot-1', start_at: slot().start_at, end_at: slot().end_at, price: 499, status: 'AVAILABLE', notes: '' } },
        (v) => { updated = v; },
      ),
    ]);
    await openDrawer();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Unblock' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Unblock' }));

    await waitFor(() => expect(updated).toEqual({ slot_id: 'slot-1', input: { block: false } }));
  });

  it('deletes a slot after the confirmation', async () => {
    let deleted: any = null;
    renderEditor([
      slotsMock([slot()]),
      capturingMock(DELETE_VENUE_SLOT, { deleteVenueSlot: true }, (v) => { deleted = v; }),
    ]);
    await openDrawer();

    await waitFor(() => expect(screen.getByText(timeLabel(21, 22))).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete this slot?')).toBeTruthy();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleted).toEqual({ slot_id: 'slot-1' }));
  });

  it('lists a day space by space, then by time, with whole-venue slots first', async () => {
    const day = NOW;
    renderEditor([
      slotsMock([
        // Two whole-venue slots (no space label) sit adjacent so the sort compares them directly.
        slot({ id: 'venue-23', space_label: undefined, start_at: atHour(day, 23), end_at: atHour(day, 23, 30) }),
        slot({ id: 'venue-20', space_label: undefined, start_at: atHour(day, 20), end_at: atHour(day, 21) }),
        slot({ id: 'roof-21', space_label: 'Roof', start_at: atHour(day, 21), end_at: atHour(day, 22) }),
        slot({ id: 'hall-22', space_label: 'Hall', start_at: atHour(day, 22), end_at: atHour(day, 23) }),
        slot({ id: 'hall-21', space_label: 'Hall', start_at: atHour(day, 21), end_at: atHour(day, 22) }),
      ]),
    ]);
    await openDrawer();

    // The add form's space picker also prints "Hall · holds 80", so only the
    // list rows — the first three matches — are the order under test.
    await waitFor(() => expect(screen.getAllByText(/^(Hall|Roof) · holds 80$/).length).toBeGreaterThanOrEqual(3));
    const order = screen.getAllByText(/^(Hall|Roof) · holds 80$/).slice(0, 3).map((el) => el.textContent);
    expect(order).toEqual(['Hall · holds 80', 'Hall · holds 80', 'Roof · holds 80']);
    const times = screen.getAllByText(/ – /).map((el) => el.textContent);
    expect(times).toEqual([
      timeLabel(20, 21),
      timeLabel(23, 23, 30),
      timeLabel(21, 22),
      timeLabel(22, 23),
      timeLabel(21, 22),
    ]);
  });

  it('creates a slot on the day the calendar is parked on', async () => {
    let created: any = null;
    const target = addDays(NOW, 2);
    renderEditor([
      slotsMock([]),
      capturingMock(
        CREATE_VENUE_SLOTS,
        { createVenueSlots: [{ __typename: 'VenueSlot', id: 'new-1', start_at: atHour(target, 21), end_at: atHour(target, 22), price: 750, status: 'AVAILABLE', notes: 'Terrace' }] },
        (v) => { created = v; },
      ),
    ]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Day' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(dayCell(target)).toBeTruthy());
    fireEvent.click(dayCell(target));

    await waitFor(() => expect(screen.getByText('No slots for this date yet.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '2000-01-01T21:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '2000-01-01T22:00' } });
    fireEvent.change(screen.getByLabelText('Price (₹)'), { target: { value: '750' } });
    fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'Terrace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));

    await waitFor(() => expect(created).not.toBeNull());
    expect(created).toEqual({
      input: {
        venue_id: VENUE_ID,
        slots: [
          {
            start_at: atHour(target, 21),
            end_at: atHour(target, 22),
            whole_day: false,
            price: 750,
            notes: 'Terrace',
            space_label: 'Hall',
            capacity: 80,
          },
        ],
        on_conflict: 'FAIL',
      },
    });
  });

  it('closes the drawer without touching anything', async () => {
    renderEditor([slotsMock([slot()])]);
    await openDrawer();

    await waitFor(() => expect(screen.getByText('Existing slots')).toBeTruthy());
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);

    await waitFor(() => expect(screen.queryByText('Existing slots')).toBeNull());
  });
});
