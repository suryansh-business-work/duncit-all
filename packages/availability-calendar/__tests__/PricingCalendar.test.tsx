import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import PricingCalendar from '../src/pricing/calendar/PricingCalendar';
import { VENUE_BOOKING_CALENDAR, VENUE_PRICE_QUOTE } from '../src/pricing/queries';
import { VENUE_SLOTS } from '../src/queries';
import type { BookingDay, PricingRule, VenuePricingData, VenuePricingInput } from '../src/pricing/types';
import { breakdownResult, makeBreakdown, makePricing } from './pricing-fixtures';

vi.mock('@mui/x-date-pickers/DatePicker', async () => ({ DatePicker: (await import('./picker-stub')).PickerStub }));
vi.mock('@mui/x-date-pickers/TimePicker', async () => ({ TimePicker: (await import('./picker-stub')).PickerStub }));

const VENUE_ID = 'venue-1';
const SETTLED = { timeout: 3000 };
const at = (d: number, h: number, m = 0) => new Date(2026, 11, d, h, m).toISOString();

/** A bookable December day, open 09:00–21:00 on this device's clock. */
const openDay = (d: number, over: Partial<BookingDay> = {}): BookingDay => ({
  date: `2026-12-${String(d).padStart(2, '0')}`,
  closed_reason: null,
  open: at(d, 9),
  close: at(d, 21),
  busy: [],
  slots: [],
  ...over,
});

const calendarResult = (days: BookingDay[]) => ({
  __typename: 'VenueBookingCalendar',
  model: 'PER_PAX',
  configured: true,
  booking_increment_minutes: 60,
  min_hours: 1,
  max_hours: 0,
  min_pax: 1,
  max_pax: 0,
  days: days.map((d) => ({
    __typename: 'VenueBookingDay',
    ...d,
    busy: d.busy.map((b) => ({ __typename: 'BusyWindow', ...b })),
    slots: d.slots.map((s) => ({ __typename: 'VenueDaySlot', ...s })),
  })),
});

function calendarMock(days: BookingDay[], seen: Record<string, any>[] = []): MockedResponse {
  return {
    request: { query: VENUE_BOOKING_CALENDAR, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: (variables: Record<string, any>) => {
      seen.push(variables);
      return { data: { venueBookingCalendar: calendarResult(days) } };
    },
  };
}

const slotRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueSlot',
  id: 'slot-1',
  venue_id: VENUE_ID,
  start_at: at(2, 10),
  end_at: at(2, 11),
  whole_day: false,
  price: 400,
  pricing_mode: 'FLAT',
  overtime_rate: 0,
  space_label: '',
  capacity: 0,
  status: 'AVAILABLE',
  booked_by_pod_id: null,
  booked_pod_title: null,
  notes: '',
  created_at: '2026-11-01T00:00:00.000Z',
  ...over,
});

const slotsMock = (rows: unknown[] = []): MockedResponse => ({
  request: { query: VENUE_SLOTS, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { venueSlots: rows } },
});

function quoteMock(seen: Record<string, any>[] = [], answer?: () => object): MockedResponse {
  return {
    request: { query: VENUE_PRICE_QUOTE, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: (variables: Record<string, any>) => {
      seen.push(variables);
      return (answer?.() ?? { data: { venuePriceQuote: breakdownResult(makeBreakdown({ pax: 1, base: 300 })) } }) as never;
    },
  };
}

interface Setup {
  pricing?: VenuePricingData;
  holidays?: string[];
  mocks?: MockedResponse[];
  savePricing?: (input: VenuePricingInput) => Promise<void>;
  saveHolidays?: (holidays: string[]) => Promise<void>;
}

function renderCalendar({ pricing = makePricing(), holidays = [], mocks, savePricing, saveHolidays }: Setup = {}) {
  const props = {
    savePricing: vi.fn(savePricing ?? (async () => undefined)),
    saveHolidays: vi.fn(saveHolidays ?? (async () => undefined)),
  };
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks ?? [slotsMock(), calendarMock([openDay(2)]), quoteMock()]}>
      <PricingCalendar venueId={VENUE_ID} pricing={pricing} holidays={holidays} {...props} />
    </MockedProvider>,
  );
  return props;
}

const cell = (ymd: string) => screen.getByTestId(`availability-day-${ymd}`);
const drawer = () => screen.getByTestId('pricing-day-drawer');
async function openDate(ymd: string) {
  await waitFor(() => expect(cell(ymd)).toHaveTextContent(/₹|Holiday|Blocked|No slots|from/));
  fireEvent.click(cell(ymd));
  return within(await screen.findByRole('presentation'));
}

const weekend: PricingRule = { type: 'WEEKDAY_SURCHARGE', label: 'Weekend', days: [0, 6], dates: [], from: null, to: null, mode: 'PERCENT', value: 20 };
const override2nd: PricingRule = { type: 'DATE_OVERRIDE', label: 'Launch', days: [], dates: ['2026-12-02'], from: null, to: null, mode: 'FLAT', value: 100 };

describe('PricingCalendar', () => {
  beforeEach(() => {
    // Only the clock is fixed (1 Dec 2026, noon): the debounce and Apollo keep real timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 1, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('the month', () => {
    it("asks for the visible grid and prints each day's rate, rule or closed reason", async () => {
      const seen: Record<string, any>[] = [];
      const days = [openDay(2), openDay(10, { closed_reason: 'HOLIDAY', open: null, close: null }), openDay(26)];
      renderCalendar({ pricing: makePricing({ price_rules: [weekend] }), mocks: [slotsMock(), calendarMock(days, seen), quoteMock()] });

      expect(screen.getByTestId('pricing-calendar-model')).toHaveTextContent('Per guest');
      await waitFor(() => expect(cell('2026-12-10')).toHaveTextContent('Holiday'));
      expect(seen[0]).toEqual({ venue_id: VENUE_ID, from: '2026-11-29', to: '2027-01-02' });
      expect(cell('2026-12-02')).toHaveTextContent('₹300 / guest');
      // 26 Dec 2026 is a Saturday: the weekend rule shows beside the raised rate.
      expect(cell('2026-12-26')).toHaveTextContent('₹360 / guest+20%');
    });

    it('says when pricing is not set up and prints no prices', async () => {
      renderCalendar({ pricing: makePricing({ model: null, configured: false }) });
      expect(screen.getByTestId('pricing-calendar-model')).toHaveTextContent('Pricing not set up');
      await waitFor(() => expect(screen.getByText('December 2026')).toBeInTheDocument());
      expect(cell('2026-12-02')).not.toHaveTextContent('₹');
    });

    it('pages months and comes back with Today, asking for each grid', async () => {
      const seen: Record<string, any>[] = [];
      renderCalendar({ mocks: [slotsMock(), calendarMock([], seen), quoteMock()] });
      await waitFor(() => expect(seen).toHaveLength(1));

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByText('January 2027')).toBeInTheDocument();
      await waitFor(() => expect(seen.at(-1)).toMatchObject({ from: '2026-12-27' }));

      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(screen.getByText('November 2026')).toBeInTheDocument();
      await waitFor(() => expect(seen.at(-1)).toMatchObject({ from: '2026-11-01', to: '2026-12-05' }));

      fireEvent.click(screen.getByRole('button', { name: 'Today' }));
      expect(screen.getByText('December 2026')).toBeInTheDocument();
    });

    it('shows a failing calendar read', async () => {
      const failing: MockedResponse = { request: { query: VENUE_BOOKING_CALENDAR, variables: () => true }, result: { errors: [new GraphQLError('Calendar is unavailable')] } };
      renderCalendar({ mocks: [slotsMock(), failing] });
      expect(await screen.findByText('Calendar is unavailable')).toBeInTheDocument();
    });

    it('shows a failing slots read', async () => {
      const failing: MockedResponse = { request: { query: VENUE_SLOTS, variables: () => true }, error: new Error('Slots are unavailable') };
      renderCalendar({ mocks: [failing, calendarMock([])] });
      expect(await screen.findByText('Slots are unavailable')).toBeInTheDocument();
    });
  });

  describe('a date', () => {
    it('opens the drawer on a click with the day’s hours and the server’s quote for the smallest booking', async () => {
      const quotes: Record<string, any>[] = [];
      renderCalendar({ mocks: [slotsMock(), calendarMock([openDay(2)]), quoteMock(quotes)] });
      const day = await openDate('2026-12-02');

      expect(day.getByText('02 Dec 2026')).toBeInTheDocument();
      expect(day.getByTestId('pricing-day-status')).toHaveTextContent(/^Open .+ – .+$/);
      expect(day.getByText('Price for 1 guests that day')).toBeInTheDocument();
      expect(await day.findByTestId('price-breakdown', undefined, SETTLED)).toBeInTheDocument();
      // Opening (09:00) plus the minimum hour, with the SAVED pricing (no draft).
      expect(quotes[0]).toEqual({ venue_id: VENUE_ID, booking: { start_at: at(2, 9), end_at: at(2, 10), pax: 1, pets: false }, draft: null });
      expect(day.queryByTestId('day-override-clear')).not.toBeInTheDocument();

      fireEvent.click(day.getByRole('button', { name: 'Close' }));
      await waitFor(() => expect(screen.queryByText('02 Dec 2026')).not.toBeInTheDocument());
    });

    it('shows a quote it could not get', async () => {
      renderCalendar({ mocks: [slotsMock(), calendarMock([openDay(2)]), quoteMock([], () => ({ errors: [new GraphQLError('Too far ahead')] }))] });
      const day = await openDate('2026-12-02');
      expect(await day.findByText('Too far ahead', undefined, SETTLED)).toBeInTheDocument();
    });

    it('sets a price override for that date only, then re-reads the month', async () => {
      const seen: Record<string, any>[] = [];
      const { savePricing } = renderCalendar({
        pricing: makePricing({ price_rules: [weekend] }),
        mocks: [slotsMock(), calendarMock([openDay(2)], seen), quoteMock()],
      });
      const day = await openDate('2026-12-02');
      const reads = seen.length;

      fireEvent.change(day.getByLabelText('Change'), { target: { value: '25' } });
      fireEvent.change(day.getByLabelText('Name (optional)'), { target: { value: '  Launch week  ' } });
      fireEvent.click(day.getByTestId('day-override-save'));

      await waitFor(() => expect(savePricing).toHaveBeenCalledTimes(1));
      expect(savePricing.mock.calls[0][0].price_rules).toEqual([
        { type: 'WEEKDAY_SURCHARGE', label: 'Weekend', mode: 'PERCENT', value: 20, days: [0, 6], dates: [], from: null, to: null },
        { type: 'DATE_OVERRIDE', label: 'Launch week', mode: 'PERCENT', value: 25, days: [], dates: ['2026-12-02'], from: null, to: null },
      ]);
      await waitFor(() => expect(seen.length).toBeGreaterThan(reads));
    });

    it('refuses an override of 0', async () => {
      const { savePricing } = renderCalendar();
      const day = await openDate('2026-12-02');
      fireEvent.change(day.getByLabelText('Change'), { target: { value: '0' } });
      fireEvent.click(day.getByTestId('day-override-save'));
      expect(await day.findByText('Enter a change other than 0')).toBeInTheDocument();
      expect(savePricing).not.toHaveBeenCalled();
    });

    it('starts from the date’s own override and clears it', async () => {
      const { savePricing } = renderCalendar({ pricing: makePricing({ price_rules: [override2nd, weekend] }) });
      const day = await openDate('2026-12-02');
      expect(cell('2026-12-02')).toHaveTextContent('₹400 / guest+₹100');
      expect(day.getByLabelText('Change')).toHaveValue(100);
      expect(day.getByLabelText('Name (optional)')).toHaveValue('Launch');

      fireEvent.click(day.getByTestId('day-override-clear'));
      await waitFor(() => expect(savePricing).toHaveBeenCalledTimes(1));
      expect(savePricing.mock.calls[0][0].price_rules).toEqual([
        { type: 'WEEKDAY_SURCHARGE', label: 'Weekend', mode: 'PERCENT', value: 20, days: [0, 6], dates: [], from: null, to: null },
      ]);
    });

    it('blocks the date in pricing and marks a holiday in the venue settings', async () => {
      const { savePricing, saveHolidays } = renderCalendar({ pricing: makePricing({ blocked_dates: ['2026-12-20'] }), holidays: ['2026-12-25'] });
      const day = await openDate('2026-12-02');

      fireEvent.click(day.getByTestId('pricing-day-block').querySelector('input') as HTMLInputElement);
      await waitFor(() => expect(savePricing).toHaveBeenCalledTimes(1));
      expect(savePricing.mock.calls[0][0].blocked_dates).toEqual(['2026-12-02', '2026-12-20']);

      fireEvent.click(day.getByTestId('pricing-day-holiday').querySelector('input') as HTMLInputElement);
      await waitFor(() => expect(saveHolidays).toHaveBeenCalledWith(['2026-12-02', '2026-12-25']));
    });

    it('unblocks a blocked date and lifts a holiday', async () => {
      const days = [openDay(10, { closed_reason: 'BLOCKED', open: null, close: null })];
      const { savePricing, saveHolidays } = renderCalendar({
        pricing: makePricing({ blocked_dates: ['2026-12-10'] }),
        holidays: ['2026-12-10'],
        mocks: [slotsMock(), calendarMock(days), quoteMock()],
      });
      const day = await openDate('2026-12-10');
      // A closed day has no quote — only why it is closed.
      expect(day.getByTestId('pricing-day-status')).toHaveTextContent('Blocked');
      expect(day.queryByTestId('pricing-day-quote')).not.toBeInTheDocument();
      const block = day.getByTestId('pricing-day-block').querySelector('input') as HTMLInputElement;
      const holiday = day.getByTestId('pricing-day-holiday').querySelector('input') as HTMLInputElement;
      expect(block).toBeChecked();
      expect(holiday).toBeChecked();

      fireEvent.click(block);
      await waitFor(() => expect(savePricing.mock.calls[0][0].blocked_dates).toEqual([]));
      fireEvent.click(holiday);
      await waitFor(() => expect(saveHolidays).toHaveBeenCalledWith([]));
    });

    it("shows the server's reason a date edit failed, until dismissed", async () => {
      renderCalendar({ savePricing: async () => Promise.reject(new Error('That date is already booked out')) });
      const day = await openDate('2026-12-02');
      fireEvent.click(day.getByTestId('pricing-day-block').querySelector('input') as HTMLInputElement);
      const alert = await day.findByText('That date is already booked out');
      fireEvent.click(within(alert.closest('.MuiAlert-root') as HTMLElement).getByRole('button', { name: 'Close' }));
      await waitFor(() => expect(day.queryByText('That date is already booked out')).not.toBeInTheDocument());
    });

    it('falls back to a plain message when the failure has none', async () => {
      renderCalendar({ saveHolidays: async () => Promise.reject('offline') });
      const day = await openDate('2026-12-02');
      fireEvent.click(day.getByTestId('pricing-day-holiday').querySelector('input') as HTMLInputElement);
      expect(await day.findByText("We couldn't update this date. Please try again.")).toBeInTheDocument();
    });

    it('lists what is booked that day, read-only, and keeps those bookings when the date closes', async () => {
      const days = [openDay(12, { busy: [{ start: at(12, 18), end: at(12, 20) }] })];
      renderCalendar({ mocks: [slotsMock([slotRow({ start_at: at(12, 18), end_at: at(12, 20), status: 'BOOKED', booked_pod_title: 'Pottery night' })]), calendarMock(days), quoteMock()] });
      const day = await openDate('2026-12-12');

      const status = day.getByTestId('pricing-day-status');
      expect(within(status).getByText('Booked')).toBeInTheDocument();
      expect(status).toHaveTextContent(/Booked.+ – .+/);
      expect(day.getByText('Bookings already made for this date stay booked.')).toBeInTheDocument();
      // The booked slot row is listed with no block or delete action.
      expect(await day.findByText('Booked by pod: Pottery night')).toBeInTheDocument();
      expect(day.queryByRole('button', { name: 'Block' })).not.toBeInTheDocument();
      expect(day.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('shows nothing about a day the calendar did not return', async () => {
      renderCalendar({ mocks: [slotsMock(), calendarMock([]), quoteMock()] });
      await waitFor(() => expect(cell('2026-12-03')).toHaveTextContent('₹300 / guest'));
      fireEvent.click(cell('2026-12-03'));
      const day = within(await screen.findByRole('presentation'));
      expect(day.getByText('03 Dec 2026')).toBeInTheDocument();
      expect(day.queryByTestId('pricing-day-status')).not.toBeInTheDocument();
      expect(day.queryByTestId('pricing-day-quote')).not.toBeInTheDocument();
    });

    it('asks no quote for an unconfigured venue or a day with no opening', async () => {
      renderCalendar({
        pricing: makePricing({ configured: false }),
        mocks: [slotsMock(), calendarMock([openDay(2), openDay(3, { open: null, close: null })]), quoteMock()],
      });
      let day = await openDate('2026-12-02');
      expect(day.queryByTestId('pricing-day-quote')).not.toBeInTheDocument();
      fireEvent.click(day.getByRole('button', { name: 'Close' }));
      day = await openDate('2026-12-03');
      expect(day.getByText('03 Dec 2026')).toBeInTheDocument();
      // No opening window to show and nothing to price from.
      expect(day.getByTestId('pricing-day-status')).not.toHaveTextContent(/Open/);
      expect(day.queryByTestId('pricing-day-quote')).not.toBeInTheDocument();
    });

    it("shows a per-slot day's slots, free or taken, and quotes the first", async () => {
      const quotes: Record<string, any>[] = [];
      const slots = [
        { start: at(2, 10), end: at(2, 12), price: 800, available: true },
        { start: at(2, 14), end: at(2, 16), price: 500, available: false },
      ];
      renderCalendar({
        pricing: makePricing({ model: 'PER_SLOT', base_rate: 0, min_pax: 4 }),
        mocks: [slotsMock(), calendarMock([openDay(2, { slots })]), quoteMock(quotes)],
      });
      await waitFor(() => expect(cell('2026-12-02')).toHaveTextContent('from ₹500'));
      const day = await openDate('2026-12-02');

      const status = day.getByTestId('pricing-day-status');
      expect(status).not.toHaveTextContent(/^Open/);
      expect(within(status).getByText('Free')).toBeInTheDocument();
      expect(within(status).getByText('Booked')).toBeInTheDocument();
      expect(status).toHaveTextContent('₹800');
      await waitFor(() => expect(quotes).toHaveLength(1), SETTLED);
      expect(quotes[0].booking).toEqual({ start_at: at(2, 10), end_at: at(2, 12), pax: 4, pets: false });
    });
  });
});
