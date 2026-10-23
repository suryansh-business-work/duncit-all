/**
 * What a host may pick and what the booking write accepts: the venue's
 * opening hours (its settings), closed days, notice/advance rules, buffers and
 * existing bookings. The host prices the booking, so the venue's pricing model
 * no longer shapes availability.
 */
import { checkBookable, dayAvailability, type AvailabilityContext } from '../../venuePricing.availability';
import type { VenuePricing } from '../../venuePricing.types';

const TZ = 'Asia/Kolkata';
const ist = (ymd: string, hhmm: string) => new Date(`${ymd}T${hhmm}:00+05:30`);
// 2027-01-02 Saturday, 2027-01-04 Monday.
const SAT = '2027-01-02';

const pricing: VenuePricing = {
  model: 'PER_HOUR',
  base_rate: 500,
  min_pax: 0,
  max_pax: 0,
  min_hours: 1,
  max_hours: 0,
  booking_increment_minutes: 30,
  min_spend: 0,
  slots: [],
  operating_hours: [{ day: 6, open: '10:00', close: '22:00' }],
  price_rules: [],
  deposit: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  gst_enabled: false,
  blocked_dates: [],
};

const ctx = ({ settings, ...overrides }: Partial<AvailabilityContext> = {}): AvailabilityContext => ({
  pricing,
  busy: [],
  now: ist('2026-12-30', '09:00'),
  timeZone: TZ,
  ...overrides,
  settings: { operating_hours: { open: '10:00', close: '22:00' }, holidays: [], weekly_off_days: [], rules: {}, ...settings },
});

describe('dayAvailability', () => {
  it("opens a day by the venue's opening hours", () => {
    const day = dayAvailability(ctx(), SAT);
    expect(day.closed_reason).toBeNull();
    expect(day.open).toEqual(ist(SAT, '10:00'));
    expect(day.close).toEqual(ist(SAT, '22:00'));
  });

  it('is closed when the venue has no opening hours, or they close before they open', () => {
    expect(dayAvailability(ctx({ settings: { operating_hours: null } }), SAT).closed_reason).toBe('CLOSED');
    expect(dayAvailability(ctx({ settings: { operating_hours: { open: '22:00', close: '10:00' } } }), SAT).closed_reason).toBe('CLOSED');
  });

  it("opens every day by the venue settings' one window, ignoring the old per-day pricing hours", () => {
    const c = ctx({ settings: { operating_hours: { open: '08:00', close: '12:00' } } });
    // The pricing row says Saturday 10-22 and nothing for Monday; neither counts any more.
    expect(dayAvailability(c, SAT).open).toEqual(ist(SAT, '08:00'));
    expect(dayAvailability(c, '2027-01-04').open).toEqual(ist('2027-01-04', '08:00'));
  });

  it.each([
    ['PAST', ctx({ now: ist('2027-01-03', '09:00') })],
    ['TOO_FAR', ctx({ settings: { rules: { max_advance_days: 2 } } })],
    ['HOLIDAY', ctx({ settings: { holidays: [SAT] } })],
    ['BLOCKED', ctx({ pricing: { ...pricing, blocked_dates: [SAT] } })],
    ['WEEKLY_OFF', ctx({ settings: { weekly_off_days: [6] } })],
  ])('reports %s', (reason, c) => {
    expect(dayAvailability(c, SAT).closed_reason).toBe(reason);
  });

  it('lists no fixed slots: a host picks any window inside the hours', () => {
    const c = ctx({ pricing: { ...pricing, model: 'PER_SLOT', slots: [{ start_time: '18:00', end_time: '20:00', price: 1500, days_of_week: [6] }] } });
    expect(dayAvailability(c, SAT).slots).toEqual([]);
  });
});

describe('checkBookable', () => {
  it('accepts a free window inside the hours', () => {
    expect(checkBookable(ctx(), ist(SAT, '18:00'), ist(SAT, '20:00'))).toEqual({ ok: true });
  });

  it('refuses a window that leaves the opening hours', () => {
    expect(checkBookable(ctx(), ist(SAT, '21:00'), ist(SAT, '23:00')).ok).toBe(false);
    expect(checkBookable(ctx(), ist(SAT, '09:00'), ist(SAT, '11:00')).ok).toBe(false);
  });

  it('refuses an overlap with an existing booking, and honours the buffer', () => {
    const busy = [{ start: ist(SAT, '16:00'), end: ist(SAT, '18:00') }];
    expect(checkBookable(ctx({ busy }), ist(SAT, '17:00'), ist(SAT, '19:00')).ok).toBe(false);
    expect(checkBookable(ctx({ busy }), ist(SAT, '18:00'), ist(SAT, '19:00')).ok).toBe(true);
    const buffered = ctx({ busy, settings: { rules: { buffer_minutes: 30 } } });
    expect(checkBookable(buffered, ist(SAT, '18:00'), ist(SAT, '19:00')).ok).toBe(false);
    expect(checkBookable(buffered, ist(SAT, '18:30'), ist(SAT, '19:30')).ok).toBe(true);
  });

  it('refuses a start inside the minimum notice', () => {
    const c = ctx({ now: ist(SAT, '17:00'), settings: { rules: { min_notice_minutes: 120 } } });
    expect(checkBookable(c, ist(SAT, '18:00'), ist(SAT, '19:00')).ok).toBe(false);
    expect(checkBookable(c, ist(SAT, '19:00'), ist(SAT, '20:00')).ok).toBe(true);
  });

  it('refuses a closed day', () => {
    expect(checkBookable(ctx({ settings: { holidays: [SAT] } }), ist(SAT, '18:00'), ist(SAT, '19:00')).ok).toBe(false);
  });

  it("books any free window inside the hours, whatever the venue's old pricing model was", () => {
    const c = ctx({ pricing: { ...pricing, model: 'PER_SLOT', slots: [{ start_time: '18:00', end_time: '20:00', price: 1500, days_of_week: [6] }] } });
    expect(checkBookable(c, ist(SAT, '18:00'), ist(SAT, '19:00')).ok).toBe(true);
    expect(checkBookable(c, ist(SAT, '12:00'), ist(SAT, '15:00')).ok).toBe(true);
  });
});
