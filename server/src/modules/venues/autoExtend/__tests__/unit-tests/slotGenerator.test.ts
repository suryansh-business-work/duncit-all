import { buildRecurringSlots } from '../../slotGenerator';
import type { ISlotTemplateConfig } from '@modules/venues/slotTemplate/slotTemplate.model';

// 2026-07-01T00:00:00Z == 05:30 IST, so 13:00 IST the same day is still future.
const NOW = new Date('2026-07-01T00:00:00.000Z');
const FROM = NOW;
const TO = new Date(NOW.getTime() + 14 * 24 * 60 * 60 * 1000);

const config = (over: Partial<ISlotTemplateConfig> = {}): ISlotTemplateConfig => ({
  weekdays: [1, 3, 5], // Mon / Wed / Fri
  start_time: '13:00',
  end_time: '14:00',
  default_price: 300,
  per_day_price: [],
  skip_weekly_off: true,
  skip_holidays: true,
  ...over,
});
const settings = (over: { weekly_off_days?: number[]; holidays?: string[] } = {}) => ({
  weekly_off_days: [],
  holidays: [],
  ...over,
});

describe('buildRecurringSlots (server generator)', () => {
  it('emits only the selected weekdays at the venue-local time (13:00 IST = 07:30 UTC)', () => {
    const slots = buildRecurringSlots(config(), settings(), FROM, TO, NOW);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.start_at.endsWith('T07:30:00.000Z'))).toBe(true);
    expect(slots.every((s) => [1, 3, 5].includes(new Date(s.start_at).getUTCDay()))).toBe(true);
  });

  it('applies the per-day price override and the default elsewhere', () => {
    const slots = buildRecurringSlots(
      config({ per_day_price: [{ weekday: 1, price: 999 }] }),
      settings(),
      FROM,
      TO,
      NOW,
    );
    for (const s of slots) {
      const expected = new Date(s.start_at).getUTCDay() === 1 ? 999 : 300;
      expect(s.price).toBe(expected);
    }
  });

  it('skips weekly-off weekdays when configured', () => {
    const slots = buildRecurringSlots(config(), settings({ weekly_off_days: [1] }), FROM, TO, NOW);
    expect(slots.some((s) => new Date(s.start_at).getUTCDay() === 1)).toBe(false);
    expect(slots.some((s) => new Date(s.start_at).getUTCDay() === 3)).toBe(true);
  });

  it('skips holidays (venue-local date) when configured', () => {
    const all = buildRecurringSlots(config(), settings(), FROM, TO, NOW);
    const aDate = all[0].start_at.slice(0, 10);
    const slots = buildRecurringSlots(config(), settings({ holidays: [aDate] }), FROM, TO, NOW);
    expect(slots.some((s) => s.start_at.slice(0, 10) === aDate)).toBe(false);
  });

  it('returns nothing for an invalid time range or empty weekdays', () => {
    expect(buildRecurringSlots(config({ end_time: '12:00' }), settings(), FROM, TO, NOW)).toEqual([]);
    expect(buildRecurringSlots(config({ weekdays: [] }), settings(), FROM, TO, NOW)).toEqual([]);
  });
});
