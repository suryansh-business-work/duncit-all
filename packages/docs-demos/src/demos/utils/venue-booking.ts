import {
  bookingEndOptions,
  bookingStartOptions,
  clampBookingPax,
  formatStatementMoney,
  instantBookingInput,
  venueQuoteLines,
  type BookingCalendarDay,
  type VenueBookingModel,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface VenueBookingMock {
  model: VenueBookingModel;
  booking_increment_minutes: number;
  min_hours: number;
  max_hours: number;
  /** Gap the venue keeps around every booking. */
  buffer_minutes: number;
  /** Earliest a booking may start from now. */
  min_notice_minutes: number;
  /** One day of venueBookingCalendar, opening 10:00–22:00 IST with 15:00–17:00 already booked. */
  day: BookingCalendarDay;
  /** The start the host tapped. */
  start: string;
  guests: number;
  min_pax: number;
  max_pax: number;
}

const IST = 'Asia/Kolkata';

export const venueBookingDemos: PackageDemo[] = [
  defineDemo<VenueBookingMock>({
    id: 'venue-booking',
    title: 'venue-booking — what a host may pick at a venue, and the price card',
    note:
      'Starts sit on the venue increment counted from local midnight, leave room for the shortest window and skip the booked 15:00–17:00. Raise buffer_minutes to 60 and the starts next to it drop out too. Change start to 13:00 and the end list stops at 15:00. Set model to PER_PAX and guests outside min_pax..max_pax snap back. The price rows come from a sample venuePriceQuote — the app never adds them up itself.',
    mock: {
      model: 'PER_HOUR',
      booking_increment_minutes: 60,
      min_hours: 1,
      max_hours: 4,
      buffer_minutes: 0,
      min_notice_minutes: 0,
      day: {
        date: '2026-11-07',
        closed_reason: null,
        open: '2026-11-07T04:30:00.000Z',
        close: '2026-11-07T16:30:00.000Z',
        busy: [{ start: '2026-11-07T09:30:00.000Z', end: '2026-11-07T11:30:00.000Z' }],
        slots: [],
      },
      start: '2026-11-07T07:30:00.000Z',
      guests: 40,
      min_pax: 10,
      max_pax: 30,
    },
    compute: (mock) => {
      const money = (value: number) => formatStatementMoney(value, '₹');
      const { lines, total, deposit } = venueQuoteLines(
        {
          model: mock.model,
          rate: 1500,
          pax: 0,
          hours: 2,
          base: 3000,
          rules: [{ type: 'WEEKDAY_SURCHARGE', label: 'Weekend', amount: 600 }],
          min_spend_top_up: 0,
          cleaning_fee: 300,
          pet_fee: 0,
          gst_pct: 18,
          taxes: 702,
          platform_fee_pct: 10,
          platform_fee: 390,
          venue_payout: 4602,
          total: 4992,
          deposit: 2000,
        },
        money
      );
      const ends = bookingEndOptions(mock.day, mock, mock.start, IST);
      return {
        starts: bookingStartOptions(mock.day, mock, IST, Date.parse('2026-11-01T00:00:00Z')),
        ends,
        guests: clampBookingPax(mock.guests, mock.min_pax, mock.max_pax),
        venue_booking: instantBookingInput({ start: mock.start, end: ends[0] ?? null, pax: 0, pets: false, spaceLabel: 'Lawn' }),
        priceCard: lines.map((line) => `${line.label ?? line.labelKey}: ${money(line.amount)}`),
        total: money(total),
        depositAtVenue: money(deposit),
      };
    },
  }),
];
