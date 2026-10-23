import {
  bookingEndOptions,
  bookingStartOptions,
  formatStatementMoney,
  offerPickerRules,
  venueOfferInput,
  venueQuoteLines,
  type BookingCalendarDay,
  type VenueOfferModel,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface VenueOfferMock {
  /** How the host offers to pay the venue. */
  model: VenueOfferModel;
  /** The amount the host typed. */
  rate: string;
  /** Gap the venue keeps around every booking. */
  buffer_minutes: number;
  /** Earliest a booking may start from now. */
  min_notice_minutes: number;
  /** One day of venueOfferCalendar, opening 10:00–22:00 IST with 15:00–17:00 already booked. */
  day: BookingCalendarDay;
  /** The start the host tapped. */
  start: string;
  guests: number;
}

const IST = 'Asia/Kolkata';

export const venueBookingDemos: PackageDemo[] = [
  defineDemo<VenueOfferMock>({
    id: 'venue-booking',
    title: 'venue-booking + venue-offer — what a host may pick, the offer it sends, and the price card',
    note:
      'Starts sit on the 30-minute grid counted from local midnight and skip the booked 15:00–17:00. Raise buffer_minutes to 60 and the starts next to it drop out too. Change start to 13:00 and the end list stops at 15:00. Clear rate (or set it to 0) and there is no offer to send. The price rows come from a sample venueOfferQuote — the app never adds them up itself.',
    mock: {
      model: 'PER_HOUR',
      rate: '1500',
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
      guests: 20,
    },
    compute: (mock) => {
      const money = (value: number) => formatStatementMoney(value, '₹');
      const rules = offerPickerRules(mock);
      const { lines, total, deposit } = venueQuoteLines(
        {
          model: 'PER_HOUR',
          rate: 1500,
          pax: 20,
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
      const ends = bookingEndOptions(mock.day, rules, mock.start, IST);
      return {
        starts: bookingStartOptions(mock.day, rules, IST, Date.parse('2026-11-01T00:00:00Z')),
        ends,
        venue_offer: venueOfferInput({
          start: mock.start,
          end: ends[3] ?? null,
          pax: mock.guests,
          pets: false,
          spaceLabel: 'Lawn',
          model: mock.model,
          rate: mock.rate,
        }),
        priceCard: lines.map((line) => `${line.label ?? line.labelKey}: ${money(line.amount)}`),
        total: money(total),
        depositAtVenue: money(deposit),
      };
    },
  }),
];
