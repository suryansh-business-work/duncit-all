import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { VENUE_PRICING, VENUE_SLOTS } from '@duncit/availability-calendar';
import { formatDay } from '@duncit/app-settings';
import CalendarPage from './CalendarPage';
import LeavesPage from './LeavesPage';
import VenueCalendar from './calendar/VenueCalendar';
import { MY_VENUES } from '../register-venue-page/queries';
import { shapeOf } from '../../__tests__/doc-shape';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

beforeEach(() => {
  globalThis.localStorage.clear();
  // Only the clock the calendar reads: Apollo and Testing Library keep their real timers.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 11, 10, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const pricing = shapeOf(VENUE_PRICING, {
  venuePricing: {
    __typename: 'VenuePricing',
    model: 'PER_PAX',
    configured: true,
    base_rate: 300,
    min_pax: 1,
    max_pax: 0,
    min_hours: 1,
    max_hours: 0,
    booking_increment_minutes: 60,
    min_spend: 0,
    slots: [],
    operating_hours: [],
    price_rules: [],
    deposit: 0,
    cleaning_fee: 0,
    pet_fee: 0,
    gst_enabled: false,
    blocked_dates: ['2026-12-20'],
  },
});

const bookedOn15th = {
  __typename: 'VenueSlot',
  id: 's1',
  venue_id: 'v1',
  start_at: new Date(2026, 11, 15, 10).toISOString(),
  end_at: new Date(2026, 11, 15, 12).toISOString(),
  whole_day: false,
  status: 'BOOKED',
  booked_pod_title: 'Board games night',
};

const slots = (rows: unknown[] = []) => shapeOf(VENUE_SLOTS, { venueSlots: rows });

const ok = { updateVenuePricing: { __typename: 'VenuePricing' }, updateVenueSettings: { __typename: 'Venue', id: 'v1' } };

const link = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[]) =>
  scriptedLink(
    {
      VenueSlots: slots(),
      VenuePricingModule: pricing,
      UpdateVenuePricing: ok,
      UpdateVenueSettings: ok,
      ...answers,
    },
    sent,
  );

const mountCalendar = (
  answers: Record<string, ScriptedAnswer> = {},
  holidays: string[] = [],
  sent: SentOperation[] = [],
) => {
  const onVenueChanged = vi.fn().mockResolvedValue(undefined);
  renderWithProviders(<VenueCalendar venueId="v1" holidays={holidays} onVenueChanged={onVenueChanged} />, {
    link: link(answers, sent),
  });
  return { onVenueChanged };
};

const day = (ymd: string) => screen.findByTestId(`availability-day-${ymd}`);
const writes = (sent: SentOperation[], name: string) => sent.filter((op) => op.name === name);

describe('VenueCalendar', () => {
  it('marks a blocked date and reads the venue slots of the month on show', async () => {
    const sent: SentOperation[] = [];
    mountCalendar({}, [], sent);
    const blocked = await day('2026-12-20');
    await waitFor(() => expect(within(blocked).getByText('Blocked')).toBeTruthy());
    expect(within(await day('2026-12-21')).queryByText('Blocked')).toBeNull();
    const read = sent.find((op) => op.name === 'VenueSlots');
    expect(read?.variables).toMatchObject({ venue_id: 'v1' });
  });

  it('moves to the next month and reads that month', async () => {
    const sent: SentOperation[] = [];
    mountCalendar({}, [], sent);
    await day('2026-12-15');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await day('2027-01-15');
    const reads = writes(sent, 'VenueSlots');
    expect(reads.length).toBeGreaterThanOrEqual(2);
    expect(reads.at(-1)?.variables.from).not.toBe(reads[0].variables.from);
  });

  it('shows the server message when the slots cannot be read', async () => {
    mountCalendar({ VenueSlots: new Error('Slots are unavailable') });
    expect(await screen.findByText('Slots are unavailable')).toBeTruthy();
  });

  it('opens a date in the drawer and closes it again', async () => {
    mountCalendar();
    fireEvent.click(await day('2026-12-15'));
    const drawer = await screen.findByTestId('venue-calendar-day');
    expect(within(drawer).getByText(formatDay('2026-12-15'))).toBeTruthy();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText(formatDay('2026-12-15'))).toBeNull());
  });

  it('blocks the date by writing it into the saved pricing, keeping the dates already blocked', async () => {
    const sent: SentOperation[] = [];
    mountCalendar({}, [], sent);
    fireEvent.click(await day('2026-12-15'));
    await waitFor(() => expect(writes(sent, 'VenuePricingModule')).toHaveLength(1));
    const block = await screen.findByRole('switch', { name: 'Block this date' });
    await waitFor(() => expect(block.hasAttribute('disabled')).toBe(false));
    fireEvent.click(block);
    await waitFor(() => expect(writes(sent, 'UpdateVenuePricing')).toHaveLength(1));
    const { venue_id, input } = writes(sent, 'UpdateVenuePricing')[0].variables as {
      venue_id: string;
      input: { blocked_dates: string[]; base_rate: number };
    };
    expect(venue_id).toBe('v1');
    expect(input.blocked_dates).toEqual(['2026-12-15', '2026-12-20']);
    expect(input.base_rate).toBe(300);
  });

  it('unblocks a blocked date', async () => {
    const sent: SentOperation[] = [];
    mountCalendar({}, [], sent);
    fireEvent.click(await day('2026-12-20'));
    const block = await screen.findByRole('switch', { name: 'Block this date' });
    await waitFor(() => expect((block as HTMLInputElement).checked).toBe(true));
    fireEvent.click(block);
    await waitFor(() => expect(writes(sent, 'UpdateVenuePricing')).toHaveLength(1));
    expect((writes(sent, 'UpdateVenuePricing')[0].variables.input as { blocked_dates: string[] }).blocked_dates).toEqual([]);
  });

  it('marks a holiday in the venue settings, in date order, then re-reads the venue', async () => {
    const sent: SentOperation[] = [];
    const { onVenueChanged } = mountCalendar({}, ['2026-12-25'], sent);
    fireEvent.click(await day('2026-12-15'));
    fireEvent.click(await screen.findByRole('switch', { name: 'Mark as holiday' }));
    await waitFor(() => expect(onVenueChanged).toHaveBeenCalledTimes(1));
    expect(writes(sent, 'UpdateVenueSettings')[0].variables).toEqual({
      venue_doc_id: 'v1',
      input: { holidays: ['2026-12-15', '2026-12-25'] },
    });
  });

  it('removes a holiday', async () => {
    const sent: SentOperation[] = [];
    mountCalendar({}, ['2026-12-25'], sent);
    fireEvent.click(await day('2026-12-25'));
    const holiday = await screen.findByRole('switch', { name: 'Mark as holiday' });
    expect((holiday as HTMLInputElement).checked).toBe(true);
    fireEvent.click(holiday);
    await waitFor(() => expect(writes(sent, 'UpdateVenueSettings')).toHaveLength(1));
    expect(writes(sent, 'UpdateVenueSettings')[0].variables.input).toEqual({ holidays: [] });
  });

  it('says what stays booked when the date has a booking', async () => {
    mountCalendar({ VenueSlots: slots([bookedOn15th]) });
    fireEvent.click(await day('2026-12-15'));
    expect(await screen.findByText('Bookings already made for this date stay booked.')).toBeTruthy();
  });

  it('does not say it for a date nothing is booked on', async () => {
    mountCalendar({ VenueSlots: slots([bookedOn15th]) });
    fireEvent.click(await day('2026-12-16'));
    await screen.findByTestId('venue-calendar-day');
    expect(screen.queryByText('Bookings already made for this date stay booked.')).toBeNull();
  });

  it('shows the server message when a write is refused, and lets it be dismissed', async () => {
    mountCalendar({ UpdateVenueSettings: new Error('Settings are read-only') });
    fireEvent.click(await day('2026-12-15'));
    fireEvent.click(await screen.findByRole('switch', { name: 'Mark as holiday' }));
    const alert = await screen.findByText('Settings are read-only');
    fireEvent.click(within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Settings are read-only')).toBeNull());
  });

  it('falls back to its own words when the server gives no message', async () => {
    mountCalendar({ UpdateVenueSettings: new Error('') });
    fireEvent.click(await day('2026-12-15'));
    fireEvent.click(await screen.findByRole('switch', { name: 'Mark as holiday' }));
    expect(await screen.findByText('Could not save. Try again.')).toBeTruthy();
  });

  it('refuses to block a date while the saved pricing is not loaded, and says so', async () => {
    const sent: SentOperation[] = [];
    mountCalendar({ VenuePricingModule: new Error('pricing down') }, [], sent);
    fireEvent.click(await day('2026-12-15'));
    fireEvent.click(await screen.findByRole('switch', { name: 'Block this date' }));
    expect(await screen.findByText('Could not load this venue. Try again.')).toBeTruthy();
    expect(writes(sent, 'UpdateVenuePricing')).toHaveLength(0);
  });
});

describe('Calendar and Leaves pages', () => {
  const venues = shapeOf(MY_VENUES, {
    myVenues: [
      {
        __typename: 'Venue',
        id: 'v1',
        status: 'APPROVED',
        venue_name: 'Cafe Mocha',
        settings: { holidays: ['2026-12-25'] },
      },
    ],
  });
  const mountPage = (ui: React.ReactElement, sent: SentOperation[] = []) =>
    renderWithProviders(ui, { link: link({ MyVenues: venues, UpdateVenueHolidays: ok }, sent) });

  it('draws the selected venue’s holidays on the calendar page', async () => {
    mountPage(<CalendarPage />);
    expect(await screen.findByTestId('venue-calendar')).toBeTruthy();
    expect(screen.getByTestId('venue-calendar-page')).toBeTruthy();
  });

  it('opens both pages for a venue that has no settings saved yet, with no holidays', async () => {
    const fresh = shapeOf(MY_VENUES, {
      myVenues: [{ __typename: 'Venue', id: 'v2', status: 'DRAFT', venue_name: 'New Place' }],
    });
    const { unmount } = renderWithProviders(<CalendarPage />, { link: link({ MyVenues: fresh }, []) });
    const cell = await screen.findByTestId('availability-day-2026-12-25');
    expect(cell.textContent).not.toMatch(/Holiday/i);
    unmount();
    renderWithProviders(<LeavesPage />, { link: link({ MyVenues: fresh }, []) });
    expect(await screen.findByText('No leave dates yet.')).toBeTruthy();
  });

  it('lists the venue’s leave dates on the leaves page and re-reads the venues after a save', async () => {
    const sent: SentOperation[] = [];
    mountPage(<LeavesPage />, sent);
    expect(await screen.findByText(formatDay('2026-12-25'))).toBeTruthy();
    expect(screen.getByTestId('venue-leaves-page')).toBeTruthy();
    // Removing the only date makes the section savable; the save re-reads MyVenues via onSaved.
    fireEvent.click(screen.getByTestId('CancelIcon'));
    fireEvent.click(screen.getByRole('button', { name: 'Save leaves & holidays' }));
    await waitFor(() => expect(writes(sent, 'UpdateVenueHolidays')).toHaveLength(1));
    expect(writes(sent, 'UpdateVenueHolidays')[0].variables).toEqual({ venue_doc_id: 'v1', input: { holidays: [] } });
    await waitFor(() => expect(writes(sent, 'MyVenues').length).toBeGreaterThanOrEqual(2));
  });
});
