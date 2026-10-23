/**
 * Venue booking calendars — the host's pickers and price card in Create Pod.
 * The booking grid is counted from local midnight in the admin zone (as the
 * server checks `booking_increment_minutes`), so these run in Asia/Kolkata
 * (UTC+5:30), where local and UTC midnights differ by a non-whole hour.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  MAX_BOOKING_CALENDAR_DAYS,
  WHOLE_VENUE_SPACE,
  bookingCalendarProps,
  bookingCalendarRange,
  bookingClosedTiles,
  bookingRateText,
  bookingTileCaption,
  bookingDayOf,
  bookingEndOptions,
  bookingMaxMinutes,
  bookingMinMinutes,
  bookingSlotId,
  bookingStartOptions,
  bookingStepMinutes,
  bookingTiles,
  venueQuoteLines,
  type BookingCalendarDay,
  type BookingRules,
  type BookingTile,
  type VenueQuote,
} from '../src/venue-booking';

const TZ = 'Asia/Kolkata';

/** 2026-11-05, open 09:00–13:00 IST (03:30–07:30 UTC). */
const day = (over: Partial<BookingCalendarDay> = {}): BookingCalendarDay => ({
  date: '2026-11-05',
  open: '2026-11-05T03:30:00.000Z',
  close: '2026-11-05T07:30:00.000Z',
  busy: [],
  slots: [],
  ...over,
});

const rules = (over: Partial<BookingRules> = {}): BookingRules => ({
  model: 'FLAT',
  booking_increment_minutes: 60,
  min_hours: 0,
  max_hours: 0,
  ...over,
});

/** Long before the day, so notice never hides a start unless a test asks it to. */
const EARLY = Date.parse('2026-11-01T00:00:00.000Z');

describe('bookingCalendarRange', () => {
  it('asks for the server cap by default, counting the first day', () => {
    expect(bookingCalendarRange('2026-11-05')).toEqual({ from: '2026-11-05', to: '2027-01-05' });
  });

  it('crosses month ends and never asks for fewer than one or more than the cap', () => {
    expect(bookingCalendarRange('2026-02-27', 3)).toEqual({ from: '2026-02-27', to: '2026-03-01' });
    expect(bookingCalendarRange('2026-11-05', 1).to).toBe('2026-11-05');
    expect(bookingCalendarRange('2026-11-05', 0).to).toBe('2026-11-05');
    expect(bookingCalendarRange('2026-11-05', 7.9).to).toBe('2026-11-11');
    expect(bookingCalendarRange('2026-11-05', 500)).toEqual(bookingCalendarRange('2026-11-05', MAX_BOOKING_CALENDAR_DAYS));
  });
});

describe('booking window limits', () => {
  it('steps by the venue increment, else the 30-minute default', () => {
    expect(bookingStepMinutes(rules({ booking_increment_minutes: 45 }))).toBe(45);
    expect(bookingStepMinutes(rules({ booking_increment_minutes: 22.7 }))).toBe(22);
    expect(bookingStepMinutes(rules({ booking_increment_minutes: 0 }))).toBe(30);
    expect(bookingStepMinutes(rules({ booking_increment_minutes: -15 }))).toBe(30);
    expect(bookingStepMinutes(rules({ booking_increment_minutes: Number.NaN }))).toBe(30);
  });

  it('keeps the shortest window on the grid and never under 30 minutes', () => {
    expect(bookingMinMinutes(rules({ booking_increment_minutes: 60 }))).toBe(60);
    expect(bookingMinMinutes(rules({ booking_increment_minutes: 0 }))).toBe(30);
    // 30 minutes rounded up onto a 20-minute grid.
    expect(bookingMinMinutes(rules({ booking_increment_minutes: 20 }))).toBe(40);
  });

  it('honours min_hours for PER_HOUR only', () => {
    expect(bookingMinMinutes(rules({ model: 'PER_HOUR', booking_increment_minutes: 30, min_hours: 2 }))).toBe(120);
    // 120 minutes rounded up onto a 45-minute grid.
    expect(bookingMinMinutes(rules({ model: 'PER_HOUR', booking_increment_minutes: 45, min_hours: 2 }))).toBe(135);
    expect(bookingMinMinutes(rules({ model: 'PER_HOUR', booking_increment_minutes: 30, min_hours: -1 }))).toBe(30);
    expect(bookingMinMinutes(rules({ model: 'PER_HOUR', booking_increment_minutes: 30, min_hours: Number.NaN }))).toBe(30);
    expect(bookingMinMinutes(rules({ model: 'FLAT', booking_increment_minutes: 30, min_hours: 2 }))).toBe(30);
  });

  it('caps the longest window by max_hours for PER_HOUR only', () => {
    expect(bookingMaxMinutes(rules({ model: 'PER_HOUR', max_hours: 3 }))).toBe(180);
    expect(bookingMaxMinutes(rules({ model: 'PER_HOUR', max_hours: 0 }))).toBeNull();
    expect(bookingMaxMinutes(rules({ model: 'FLAT', max_hours: 3 }))).toBeNull();
  });
});

describe('bookingStartOptions', () => {
  it('offers every grid start that leaves room for the shortest window before closing', () => {
    expect(bookingStartOptions(day(), rules(), TZ, EARLY)).toEqual([
      '2026-11-05T03:30:00.000Z', // 09:00 IST
      '2026-11-05T04:30:00.000Z',
      '2026-11-05T05:30:00.000Z',
      '2026-11-05T06:30:00.000Z', // 12:00 IST, ends at closing
    ]);
  });

  it('counts the grid from local midnight, not UTC midnight', () => {
    // Opens 09:10 IST; a 45-minute grid from IST midnight lands on 09:45 IST
    // (04:15 UTC). Counted from UTC midnight it would wrongly be 03:45 UTC.
    const starts = bookingStartOptions(
      day({ open: '2026-11-05T03:40:00.000Z' }),
      rules({ booking_increment_minutes: 45 }),
      TZ,
      EARLY
    );
    expect(starts[0]).toBe('2026-11-05T04:15:00.000Z');
    expect(starts.at(-1)).toBe('2026-11-05T06:30:00.000Z'); // 12:00 IST + 45 min ≤ 13:00
  });

  it('keeps clear of a booked window, and of its buffer on both sides', () => {
    const busyDay = day({ busy: [{ start: '2026-11-05T04:30:00.000Z', end: '2026-11-05T05:30:00.000Z' }] }); // 10–11 IST
    const step30 = rules({ booking_increment_minutes: 30 });
    // No buffer: a window may end as the booking starts, or start as it ends.
    expect(bookingStartOptions(busyDay, step30, TZ, EARLY)).toEqual([
      '2026-11-05T03:30:00.000Z',
      '2026-11-05T04:00:00.000Z',
      '2026-11-05T05:30:00.000Z',
      '2026-11-05T06:00:00.000Z',
      '2026-11-05T06:30:00.000Z',
      '2026-11-05T07:00:00.000Z',
    ]);
    // 30-minute buffer: 09:30 (ends 10:00) and 11:00 IST are now too close.
    expect(bookingStartOptions(busyDay, { ...step30, buffer_minutes: 30 }, TZ, EARLY)).toEqual([
      '2026-11-05T03:30:00.000Z',
      '2026-11-05T06:00:00.000Z',
      '2026-11-05T06:30:00.000Z',
      '2026-11-05T07:00:00.000Z',
    ]);
  });

  it('hides starts earlier than now plus the minimum notice, keeping one exactly at it', () => {
    const now = Date.parse('2026-11-05T03:00:00.000Z'); // 08:30 IST
    expect(bookingStartOptions(day(), rules({ min_notice_minutes: 120 }), TZ, now)).toEqual([
      '2026-11-05T05:30:00.000Z',
      '2026-11-05T06:30:00.000Z',
    ]);
    // Notice ends at 10:00 IST exactly — that start stays.
    expect(bookingStartOptions(day(), rules({ min_notice_minutes: 90 }), TZ, now)[0]).toBe('2026-11-05T04:30:00.000Z');
    // Without notice, a start already past is still hidden.
    expect(bookingStartOptions(day(), rules(), TZ, Date.parse('2026-11-05T05:00:00.000Z'))[0]).toBe(
      '2026-11-05T05:30:00.000Z'
    );
  });

  it('offers nothing on a closed day or one without usable hours', () => {
    expect(bookingStartOptions(day({ closed_reason: 'HOLIDAY' }), rules(), TZ, EARLY)).toEqual([]);
    expect(bookingStartOptions(day({ open: null }), rules(), TZ, EARLY)).toEqual([]);
    expect(bookingStartOptions(day({ close: undefined }), rules(), TZ, EARLY)).toEqual([]);
    expect(bookingStartOptions(day({ close: '2026-11-05T03:30:00.000Z' }), rules(), TZ, EARLY)).toEqual([]);
    expect(bookingStartOptions(day({ open: 'not a time' }), rules(), TZ, EARLY)).toEqual([]);
    expect(bookingStartOptions(day({ date: '05/11/2026' }), rules(), TZ, EARLY)).toEqual([]);
  });

  it('offers nothing when the shortest window is longer than the opening hours', () => {
    const perHour = rules({ model: 'PER_HOUR', booking_increment_minutes: 60, min_hours: 5 });
    expect(bookingStartOptions(day(), perHour, TZ, EARLY)).toEqual([]);
  });
});

describe('bookingEndOptions', () => {
  it('offers grid ends from the shortest window up to closing', () => {
    expect(bookingEndOptions(day(), rules(), '2026-11-05T05:30:00.000Z', TZ)).toEqual([
      '2026-11-05T06:30:00.000Z',
      '2026-11-05T07:30:00.000Z',
    ]);
  });

  it('holds a PER_HOUR window between min_hours and max_hours', () => {
    const perHour = rules({ model: 'PER_HOUR', booking_increment_minutes: 30, min_hours: 1, max_hours: 2 });
    expect(bookingEndOptions(day(), perHour, '2026-11-05T03:30:00.000Z', TZ)).toEqual([
      '2026-11-05T04:30:00.000Z',
      '2026-11-05T05:00:00.000Z',
      '2026-11-05T05:30:00.000Z',
    ]);
    // Closing comes before max_hours.
    expect(bookingEndOptions(day(), perHour, '2026-11-05T06:30:00.000Z', TZ)).toEqual(['2026-11-05T07:30:00.000Z']);
  });

  it('stops short of the next booked window and its buffer', () => {
    const busyDay = day({ busy: [{ start: '2026-11-05T04:30:00.000Z', end: '2026-11-05T05:30:00.000Z' }] });
    const step30 = rules({ booking_increment_minutes: 30 });
    expect(bookingEndOptions(busyDay, step30, '2026-11-05T03:30:00.000Z', TZ)).toEqual([
      '2026-11-05T04:00:00.000Z',
      '2026-11-05T04:30:00.000Z',
    ]);
    expect(bookingEndOptions(busyDay, { ...step30, buffer_minutes: 30 }, '2026-11-05T03:30:00.000Z', TZ)).toEqual([
      '2026-11-05T04:00:00.000Z',
    ]);
    // After the booking plus its buffer, the rest of the day is open.
    expect(bookingEndOptions(busyDay, { ...step30, buffer_minutes: 30 }, '2026-11-05T06:00:00.000Z', TZ)).toEqual([
      '2026-11-05T06:30:00.000Z',
      '2026-11-05T07:00:00.000Z',
      '2026-11-05T07:30:00.000Z',
    ]);
  });

  it('offers nothing for a closed day or an unreadable start', () => {
    expect(bookingEndOptions(day({ closed_reason: 'MAINTENANCE' }), rules(), '2026-11-05T03:30:00.000Z', TZ)).toEqual([]);
    expect(bookingEndOptions(day(), rules(), 'not a time', TZ)).toEqual([]);
  });
});

describe('bookingTiles', () => {
  const slotDay = (date: string, over: Partial<BookingCalendarDay> = {}) =>
    day({
      date,
      slots: [
        { start: `${date}T03:30:00.000Z`, end: `${date}T05:30:00.000Z`, price: 1200, available: true },
        { start: `${date}T05:30:00.000Z`, end: `${date}T07:30:00.000Z`, price: 1500, available: false },
      ],
      ...over,
    });

  it('offers only the free slots of a PER_SLOT venue, keyed by their window, priced', () => {
    const tiles = bookingTiles(
      [slotDay('2026-11-05'), slotDay('2026-11-06', { closed_reason: 'HOLIDAY' })],
      rules({ model: 'PER_SLOT' }),
      TZ,
      EARLY
    );
    expect(tiles).toEqual([
      {
        id: bookingSlotId('2026-11-05T03:30:00.000Z', '2026-11-05T05:30:00.000Z'),
        start_at: '2026-11-05T03:30:00.000Z',
        end_at: '2026-11-05T05:30:00.000Z',
        price: 1200,
      },
    ]);
    expect(tiles[0].id).toBe('2026-11-05T03:30:00.000Z|2026-11-05T05:30:00.000Z');
  });

  it('offers every valid start for other models, unpriced and open-ended, skipping closed days', () => {
    const days = [
      day(),
      day({ date: '2026-11-06', open: '2026-11-06T03:30:00.000Z', close: '2026-11-06T07:30:00.000Z', closed_reason: 'HOLIDAY' }),
    ];
    const tiles = bookingTiles(days, rules({ model: 'PER_PAX' }), TZ, EARLY);
    expect(tiles).toHaveLength(4);
    expect(tiles[0]).toEqual({
      id: '2026-11-05T03:30:00.000Z',
      start_at: '2026-11-05T03:30:00.000Z',
      end_at: null,
      price: null,
    });
    expect(tiles.every((tile) => tile.start_at.startsWith('2026-11-05'))).toBe(true);
  });
});

describe('bookingDayOf', () => {
  const days = [day(), day({ date: '2026-11-06' })];

  it('finds the day by local midnight in the zone', () => {
    // 23:59 IST on the 5th.
    expect(bookingDayOf(days, '2026-11-05T18:29:00.000Z', TZ)?.date).toBe('2026-11-05');
    // 00:00 IST on the 6th is still the 5th in UTC.
    expect(bookingDayOf(days, '2026-11-05T18:30:00.000Z', TZ)?.date).toBe('2026-11-06');
  });

  it('is null outside the loaded range or for an unreadable start', () => {
    expect(bookingDayOf(days, '2026-11-04T18:29:59.999Z', TZ)).toBeNull();
    expect(bookingDayOf(days, '2026-11-07T00:00:00.000Z', TZ)).toBeNull();
    expect(bookingDayOf(days, 'not a time', TZ)).toBeNull();
  });
});

describe('bookingCalendarProps', () => {
  const tiles: BookingTile[] = [
    { id: 'a', start_at: '2026-11-05T03:30:00.000Z', end_at: null, price: 300 },
    { id: 'b', start_at: '2026-11-05T04:30:00.000Z', end_at: null, price: null },
  ];
  const base = { t, money, model: 'FLAT' };

  it('requires a window and writes each price into the tile caption, not the price line', () => {
    const props = bookingCalendarProps({ ...base, tiles, loading: true, error: 'boom', selectedId: 'b', onPick: vi.fn() });
    expect(props).toMatchObject({ loading: true, error: 'boom', selectedSlotId: 'b', required: true, showPrice: false });
    expect(props.slots).toEqual([
      { ...tiles[0], caption: '₹300' },
      { ...tiles[1], caption: '' },
    ]);
  });

  it('resolves a picked calendar tile back to its booking tile, ignoring unknown ids', () => {
    const onPick = vi.fn();
    const props = bookingCalendarProps({ ...base, tiles, loading: false, selectedId: '', onPick });
    props.onPick({ id: 'b' });
    expect(onPick).toHaveBeenCalledWith(tiles[1]);
    props.onPick({ id: 'gone' });
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});

describe('bookingRateText', () => {
  it('puts the unit on per-guest and per-hour rates only', () => {
    expect(bookingRateText('PER_PAX', 300, t, money)).toBe('mweb.createPod.venueTerms.ratePerGuest {"price":"₹300"}');
    expect(bookingRateText('PER_HOUR', 1000, t, money)).toBe('mweb.createPod.venueTerms.ratePerHour {"price":"₹1000"}');
    expect(bookingRateText('FLAT', 5000, t, money)).toBe('₹5000');
    expect(bookingRateText('PER_SLOT', 800, t, money)).toBe('₹800');
    expect(bookingRateText(null, 800, t, money)).toBe('₹800');
  });
});

describe('bookingTileCaption', () => {
  const tile = (over: Partial<BookingTile> = {}): BookingTile => ({
    id: 'x',
    start_at: '2026-11-05T03:30:00.000Z',
    end_at: null,
    price: 300,
    ...over,
  });

  it('names why a closed day is shut, before any price', () => {
    expect(bookingTileCaption(tile({ closed_reason: 'HOLIDAY' }), 'PER_PAX', t, money)).toBe('mweb.createPod.venueTerms.closedHoliday');
    expect(bookingTileCaption(tile({ closed_reason: 'BLOCKED', price: null }), 'FLAT', t, money)).toBe(
      'mweb.createPod.venueTerms.closedBlocked'
    );
  });

  it('shows nothing for an unknown price, and ignores a closed reason it has no label for', () => {
    expect(bookingTileCaption(tile({ price: null }), 'FLAT', t, money)).toBe('');
    expect(bookingTileCaption(tile({ closed_reason: 'PAST' }), 'FLAT', t, money)).toBe('₹300');
  });

  it('adds the day’s flat change to a per-unit rate, signed', () => {
    expect(bookingTileCaption(tile({ price_extra: 500 }), 'PER_PAX', t, money)).toBe(
      'mweb.createPod.venueTerms.rateWithExtra {"rate":"mweb.createPod.venueTerms.ratePerGuest {\\"price\\":\\"₹300\\"}","extra":"+₹500"}'
    );
    expect(bookingTileCaption(tile({ price_extra: -200 }), 'FLAT', t, money)).toBe(
      'mweb.createPod.venueTerms.rateWithExtra {"rate":"₹300","extra":"-₹200"}'
    );
    expect(bookingTileCaption(tile({ price: 0 }), 'PER_SLOT', t, money)).toBe('₹0');
  });
});

describe('bookingTiles with the venue rate and rules', () => {
  // 2026-11-07 is a Saturday: +20% weekend, +₹500 flat cleaning-up charge.
  const saturday = day({ date: '2026-11-07', open: '2026-11-07T03:30:00.000Z', close: '2026-11-07T05:30:00.000Z' });
  const priceRules = [
    { type: 'WEEKDAY_SURCHARGE', days: [6], mode: 'PERCENT', value: 20 },
    { type: 'WEEKDAY_SURCHARGE', days: [6], mode: 'FLAT', value: 500 },
  ];

  it('prices per-guest starts at the day rate and keeps the flat change apart', () => {
    const tiles = bookingTiles([saturday, day()], rules({ model: 'PER_PAX', base_rate: 300, price_rules: priceRules }), TZ, EARLY);
    expect(tiles[0]).toMatchObject({ price: 360, price_extra: 500 });
    // Thursday: no rule matches, so no extra.
    const thursday = tiles.find((tile) => tile.start_at.startsWith('2026-11-05'));
    expect(thursday).toEqual({ id: thursday?.id, start_at: thursday?.start_at, end_at: null, price: 300 });
  });

  it('folds every rule into a FLAT booking price', () => {
    const [tile] = bookingTiles([saturday], rules({ model: 'FLAT', base_rate: 1000, price_rules: priceRules }), TZ, EARLY);
    expect(tile).toMatchObject({ price: 1700 });
    expect(tile.price_extra).toBeUndefined();
  });

  it('applies the day rules to each PER_SLOT slot price', () => {
    const slotted = { ...saturday, slots: [{ start: '2026-11-07T03:30:00.000Z', end: '2026-11-07T05:30:00.000Z', price: 1000, available: true }] };
    const [tile] = bookingTiles([slotted], rules({ model: 'PER_SLOT', price_rules: priceRules }), TZ, EARLY);
    expect(tile.price).toBe(1700);
  });

  it('leaves the price unknown without a base rate', () => {
    const [tile] = bookingTiles([saturday], rules({ model: 'PER_HOUR', base_rate: null }), TZ, EARLY);
    expect(tile.price).toBeNull();
  });
});

describe('bookingClosedTiles', () => {
  it('adds one disabled whole-day tile for each holiday or blocked day, at local midnight', () => {
    const days = [
      day({ date: '2026-11-05', closed_reason: 'HOLIDAY' }),
      day({ date: '2026-11-06', closed_reason: 'BLOCKED' }),
      day({ date: '2026-11-07', closed_reason: 'WEEKLY_OFF' }),
      day({ date: '2026-11-08', closed_reason: 'PAST' }),
      day({ date: '2026-11-09' }),
      day({ date: 'not-a-day', closed_reason: 'HOLIDAY' }),
    ];
    expect(bookingClosedTiles(days, TZ)).toEqual([
      {
        id: 'closed|2026-11-05',
        start_at: '2026-11-04T18:30:00.000Z',
        end_at: null,
        price: null,
        closed_reason: 'HOLIDAY',
        whole_day: true,
        disabled: true,
      },
      {
        id: 'closed|2026-11-06',
        start_at: '2026-11-05T18:30:00.000Z',
        end_at: null,
        price: null,
        closed_reason: 'BLOCKED',
        whole_day: true,
        disabled: true,
      },
    ]);
  });
});

describe('venueQuoteLines', () => {
  const money = (value: number) => `₹${value}`;
  // 2h at ₹500 = 1000; rules +350; cleaning 150 → venue price 1500; GST 18% = 270
  // → venue payout 1770; Duncit's 10% on top = 177 → total 1947. Deposit apart.
  const quote: VenueQuote = {
    model: 'PER_HOUR',
    rate: 500,
    pax: 0,
    hours: 2,
    base: 1000,
    rules: [
      { type: 'WEEKDAY_SURCHARGE', label: null, amount: 100 },
      { type: 'DATE_RANGE', label: 'Diwali week', amount: 200 },
      { type: 'SOMETHING_NEW', amount: 50 },
    ],
    min_spend_top_up: 0,
    cleaning_fee: 150,
    pet_fee: 0,
    gst_pct: 18,
    taxes: 270,
    platform_fee_pct: 10,
    platform_fee: 177,
    venue_payout: 1770,
    total: 1947,
    deposit: 500,
  };

  it('lists base, rules and only the fees that apply, in the server order', () => {
    const { lines } = venueQuoteLines(quote, money);
    expect(lines.map((line) => line.id)).toEqual(['base', 'rule-0', 'rule-1', 'rule-2', 'cleaning', 'taxes', 'duncit-fee']);
    expect(lines[0]).toEqual({
      id: 'base',
      labelKey: 'mweb.createPod.quote.baseHour',
      vars: { rate: '₹500', pax: 0, hours: 2 },
      amount: 1000,
    });
  });

  it('labels rules by type, keeps a venue-named rule label, and falls back for an unknown type', () => {
    const [, weekday, range, unknown] = venueQuoteLines(quote, money).lines;
    expect(weekday).toEqual({ id: 'rule-0', labelKey: 'mweb.createPod.quote.ruleWeekday', amount: 100 });
    expect(range).toEqual({ id: 'rule-1', labelKey: 'mweb.createPod.quote.ruleRange', label: 'Diwali week', amount: 200 });
    expect(unknown.labelKey).toBe('mweb.createPod.quote.ruleDate');
  });

  it('shows the GST and Duncit fee rates, with the commission on top of the venue payout', () => {
    const { lines, total, deposit } = venueQuoteLines(quote, money);
    const byId = Object.fromEntries(lines.map((line) => [line.id, line]));
    expect(byId.taxes).toMatchObject({ amount: 270, vars: { pct: 18 } });
    expect(byId['duncit-fee']).toMatchObject({ amount: 177, vars: { pct: 10 } });
    // The rows add up to the total; the refundable deposit is never in it.
    expect(lines.reduce((sum, line) => sum + line.amount, 0)).toBe(total);
    expect(total).toBe(quote.venue_payout + quote.platform_fee);
    expect(deposit).toBe(500);
  });

  it('adds the min-spend top-up and pet fee only when they apply', () => {
    const { lines } = venueQuoteLines({ ...quote, rules: [], min_spend_top_up: 300, pet_fee: 250, cleaning_fee: 0 }, money);
    expect(lines.map((line) => line.id)).toEqual(['base', 'min-spend', 'pets', 'taxes', 'duncit-fee']);
    expect(lines.find((line) => line.id === 'pets')).not.toHaveProperty('vars');
  });

  it('names the base by model, reading an unknown model as flat', () => {
    expect(venueQuoteLines({ ...quote, model: 'PER_PAX' }, money).lines[0].labelKey).toBe('mweb.createPod.quote.basePax');
    expect(venueQuoteLines({ ...quote, model: 'PER_SLOT' }, money).lines[0].labelKey).toBe('mweb.createPod.quote.baseSlot');
    expect(venueQuoteLines({ ...quote, model: 'MYSTERY' }, money).lines[0].labelKey).toBe('mweb.createPod.quote.baseFlat');
  });
});
