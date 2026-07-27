import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
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
import VenueAvailabilityPage from './VenueAvailabilityPage';
import { CREATE_VENUE_SLOTS, DELETE_VENUE_SLOT, UPDATE_VENUE_SLOT, VENUE_SLOTS } from './queries';
import { MY_VENUES } from '../register-venue-page/queries';
import { MY_SLOT_TEMPLATES, UPDATE_VENUE_SETTINGS } from './recurring/recurring.queries';

afterEach(cleanup);

const VENUE_ID = 'venue-1';
const NOW = new Date();
const HOLIDAY = format(addDays(NOW, 1), 'yyyy-MM-dd');

const venue = (over: Record<string, unknown> = {}) => ({
  __typename: 'Venue',
  id: VENUE_ID,
  status: 'APPROVED',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  venue_name: 'Skyline Banquets',
  venue_type: 'BANQUET',
  capacity: 120,
  capacity_items: [{ __typename: 'VenueCapacityItem', label: 'Hall', capacity: 80 }],
  cover_image_url: '',
  city: 'Pune',
  locality: 'Baner',
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
  ...over,
});

const venuesMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: MY_VENUES, variables: {} },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { myVenues: [venue(over)] } },
});

const slot = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueSlot',
  id: 'slot-1',
  venue_id: VENUE_ID,
  start_at: setTimeOnDate(NOW, { hours: 21, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString(),
  end_at: setTimeOnDate(NOW, { hours: 22, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString(),
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
 *  variables the page asked for, so the view range itself can be asserted. */
const slotsMock = (rows: unknown[], seen: Record<string, any>[] = []): MockedResponse => ({
  request: { query: VENUE_SLOTS },
  variableMatcher: () => true,
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
  request: { query },
  variableMatcher: () => true,
  result: (variables: Record<string, any>) => {
    capture(variables);
    return { data } as any;
  },
});

function renderPage(mocks: MockedResponse[]) {
  const ui: ReactElement = (
    <MemoryRouter initialEntries={[`/venue-availability/${VENUE_ID}`]}>
      <Routes>
        <Route path="/venue-availability/:venueId" element={<VenueAvailabilityPage />} />
        <Route path="/register-venue" element={<div>Venues list</div>} />
      </Routes>
    </MemoryRouter>
  );
  return render(
    <MockedProvider mocks={mocks}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>{ui}</LocalizationProvider>
    </MockedProvider>,
  );
}

const monthLabel = (d: Date) => format(d, 'MMMM yyyy');

/** Fills a MUI X time field: pasting a full value is the one deterministic way
 *  to set every section at once. */
const pasteTime = (input: HTMLElement, value: string) =>
  fireEvent.paste(input, { clipboardData: { getData: () => value } });

describe('VenueAvailabilityPage guards', () => {
  it('refuses a venue that is not on my list and links back', async () => {
    renderPage([venuesMock({ id: 'someone-elses' }), slotsMock([])]);

    await waitFor(() => expect(screen.getByText("Venue not found, or it isn't yours.")).toBeTruthy());
    expect(screen.queryByText('Slot availability')).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: 'Back to venues' }));
    expect(screen.getByText('Venues list')).toBeTruthy();
  });

  it('blocks editing until the venue is approved, naming the current status', async () => {
    renderPage([venuesMock({ status: 'PENDING' }), slotsMock([])]);

    await waitFor(() =>
      expect(
        screen.getByText('Availability is only editable once your venue is approved (current status: PENDING).'),
      ).toBeTruthy(),
    );
    expect(screen.queryByText('Slot availability')).toBeNull();
  });
});

describe('VenueAvailabilityPage calendar', () => {
  it('opens on the current month and asks for that month of slots', async () => {
    const seen: Record<string, any>[] = [];
    renderPage([venuesMock(), slotsMock([slot()], seen)]);

    await waitFor(() => expect(screen.getByText('Venue · Skyline Banquets')).toBeTruthy());
    expect(screen.getByText(monthLabel(NOW))).toBeTruthy();
    expect(seen[0]).toEqual({
      venue_id: VENUE_ID,
      from: startOfMonth(NOW).toISOString(),
      to: endOfMonth(NOW).toISOString(),
    });
  });

  it('marks the venue holiday coming from the venue settings', async () => {
    renderPage([venuesMock(), slotsMock([])]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    expect(screen.getByLabelText('Venue on leave')).toBeTruthy();
  });

  it('switches to the day view and re-queries just that day', async () => {
    const seen: Record<string, any>[] = [];
    renderPage([venuesMock(), slotsMock([], seen)]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Day' }));

    expect(screen.getByText(format(NOW, 'EEEE, dd MMM yyyy'))).toBeTruthy();
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
    renderPage([venuesMock(), slotsMock([], seen)]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Week' }));

    const weekLabel = (d: Date) =>
      `${format(startOfWeek(d, { weekStartsOn: 0 }), 'dd MMM')} – ${format(endOfWeek(d, { weekStartsOn: 0 }), 'dd MMM')}`;
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
    renderPage([venuesMock(), slotsMock([])]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText(monthLabel(subMonths(NOW, 1)))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText(monthLabel(NOW))).toBeTruthy();
  });

  it('stops paging forward once the 60-day booking window is exhausted', async () => {
    renderPage([venuesMock(), slotsMock([])]);
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
    renderPage([
      venuesMock(),
      { request: { query: VENUE_SLOTS }, variableMatcher: () => true, error: new Error('Slots are unavailable') },
    ]);

    await waitFor(() => expect(screen.getByText('Slots are unavailable')).toBeTruthy());
  });

  it('opens the recurring availability dialog', async () => {
    renderPage([venuesMock(), slotsMock([]), templatesMock]);
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

describe('VenueAvailabilityPage refresh', () => {
  it('reloads the visible range once the dialog saves the venue settings', async () => {
    const seen: Record<string, any>[] = [];
    renderPage([
      venuesMock(),
      slotsMock([], seen),
      templatesMock,
      {
        request: { query: UPDATE_VENUE_SETTINGS },
        variableMatcher: () => true,
        result: { data: { updateVenueSettings: venue() } },
      },
    ]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Recurring availability' }));
    const before = seen.length;
    fireEvent.click(screen.getByRole('button', { name: /Future availability/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save auto-extend' }));

    await waitFor(() => expect(seen).toHaveLength(before + 1));
  });
});

describe('VenueAvailabilityPage day drawer', () => {
  const openDrawer = async () => {
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Day' }));
    await waitFor(() => expect(screen.getByText(format(NOW, 'EEEE, dd MMM'))).toBeTruthy());
    fireEvent.click(screen.getByText(format(NOW, 'EEEE, dd MMM')));
  };

  it('blocks the picked slot and refreshes the day', async () => {
    let updated: any = null;
    renderPage([
      venuesMock(),
      slotsMock([slot()]),
      capturingMock(
        UPDATE_VENUE_SLOT,
        {
          updateVenueSlot: {
            __typename: 'VenueSlot',
            id: 'slot-1',
            start_at: slot().start_at,
            end_at: slot().end_at,
            price: 499,
            status: 'BLOCKED',
            notes: '',
          },
        },
        (v) => { updated = v; },
      ),
    ]);
    await openDrawer();

    await waitFor(() => expect(screen.getByText('09:00 PM – 10:00 PM')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));

    await waitFor(() => expect(updated).toEqual({ slot_id: 'slot-1', input: { block: true } }));
  });

  it('unblocks a blocked slot', async () => {
    let updated: any = null;
    renderPage([
      venuesMock(),
      slotsMock([slot({ status: 'BLOCKED' })]),
      capturingMock(
        UPDATE_VENUE_SLOT,
        {
          updateVenueSlot: {
            __typename: 'VenueSlot',
            id: 'slot-1',
            start_at: slot().start_at,
            end_at: slot().end_at,
            price: 499,
            status: 'AVAILABLE',
            notes: '',
          },
        },
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
    renderPage([
      venuesMock(),
      slotsMock([slot()]),
      capturingMock(DELETE_VENUE_SLOT, { deleteVenueSlot: true }, (v) => { deleted = v; }),
    ]);
    await openDrawer();

    await waitFor(() => expect(screen.getByText('09:00 PM – 10:00 PM')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete this slot?')).toBeTruthy();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleted).toEqual({ slot_id: 'slot-1' }));
  });

  it('creates a slot on the day the calendar is parked on', async () => {
    const seen: Record<string, any>[] = [];
    let created: any = null;
    const target = addDays(NOW, 2);
    renderPage([
      venuesMock(),
      slotsMock([], seen),
      capturingMock(
        CREATE_VENUE_SLOTS,
        {
          createVenueSlots: [
            {
              __typename: 'VenueSlot',
              id: 'new-1',
              start_at: setTimeOnDate(target, { hours: 21, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString(),
              end_at: setTimeOnDate(target, { hours: 22, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString(),
              price: 750,
              status: 'AVAILABLE',
              notes: 'Terrace',
            },
          ],
        },
        (v) => { created = v; },
      ),
    ]);
    await waitFor(() => expect(screen.getByText(monthLabel(NOW))).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Day' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByText(format(target, 'EEEE, dd MMM'))).toBeTruthy());
    fireEvent.click(screen.getByText(format(target, 'EEEE, dd MMM')));

    await waitFor(() => expect(screen.getByText('No slots for this date yet.')).toBeTruthy());
    pasteTime(screen.getByLabelText('Start'), '09:00 PM');
    pasteTime(screen.getByLabelText('End'), '10:00 PM');
    fireEvent.change(screen.getByLabelText('Price (₹)'), { target: { value: '750' } });
    fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'Terrace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));

    await waitFor(() => expect(created).not.toBeNull());
    expect(created).toEqual({
      input: {
        venue_id: VENUE_ID,
        slots: [
          {
            start_at: setTimeOnDate(target, { hours: 21, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString(),
            end_at: setTimeOnDate(target, { hours: 22, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString(),
            price: 750,
            notes: 'Terrace',
          },
        ],
      },
    });
  });

  it('closes the drawer without touching anything', async () => {
    renderPage([venuesMock(), slotsMock([slot()])]);
    await openDrawer();

    await waitFor(() => expect(screen.getByText('Existing slots')).toBeTruthy());
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);

    await waitFor(() => expect(screen.queryByText('Existing slots')).toBeNull());
  });
});
