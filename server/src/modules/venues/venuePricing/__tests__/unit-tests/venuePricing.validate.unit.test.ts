/** The Venue Pricing Module's input rules — the same checks for preview and save. */
import { cleanVenuePricing, PricingInputError } from '../../venuePricing.validate';

const valid = { model: 'PER_HOUR', base_rate: 500, min_hours: 1, max_hours: 4, booking_increment_minutes: 30 };

const refuses = (input: unknown, message: RegExp) => {
  expect(() => cleanVenuePricing(input)).toThrow(PricingInputError);
  expect(() => cleanVenuePricing(input)).toThrow(message);
};

describe('cleanVenuePricing', () => {
  it('normalises a valid input and fills the defaults', () => {
    const p = cleanVenuePricing({ ...valid, blocked_dates: ['2027-01-05', '2027-01-02', '2027-01-05'] });
    expect(p).toMatchObject({ model: 'PER_HOUR', base_rate: 500, min_spend: 0, gst_enabled: false, slots: [] });
    expect(p.blocked_dates).toEqual(['2027-01-02', '2027-01-05']);
  });

  it('accepts a cleared model (pricing switched off)', () => {
    expect(cleanVenuePricing({ model: null }).model).toBeNull();
  });

  it('refuses an unknown model and a missing rate', () => {
    refuses({ model: 'PER_DAY' }, /pricing model/);
    refuses({ ...valid, base_rate: 0 }, /rate/);
  });

  it('holds the per-model limits', () => {
    refuses({ model: 'PER_PAX', base_rate: 100, min_pax: 0 }, /Minimum guests/);
    refuses({ model: 'PER_PAX', base_rate: 100, min_pax: 10, max_pax: 5 }, /Maximum guests/);
    refuses({ ...valid, min_hours: 5, max_hours: 2 }, /Maximum hours/);
    refuses({ ...valid, booking_increment_minutes: 20 }, /multiple of 15/);
    refuses({ ...valid, min_hours: 25 }, /between 0 and 24/);
  });

  it('PER_SLOT needs slots, with valid times and days, and no two overlapping on a day', () => {
    refuses({ model: 'PER_SLOT' }, /at least one slot/);
    refuses({ model: 'PER_SLOT', slots: [{ start_time: '18:00', end_time: '17:00', price: 1, days_of_week: [1] }] }, /end must be after/);
    refuses({ model: 'PER_SLOT', slots: [{ start_time: '18:00', end_time: '20:00', price: 1, days_of_week: [] }] }, /at least one day/);
    refuses({ model: 'PER_SLOT', slots: [{ start_time: '18:00', end_time: '20:00', price: 1, days_of_week: [7] }] }, /0 \(Sun\) to 6/);
    refuses(
      {
        model: 'PER_SLOT',
        slots: [
          { start_time: '18:00', end_time: '20:00', price: 1, days_of_week: [1, 2] },
          { start_time: '19:00', end_time: '21:00', price: 1, days_of_week: [2] },
        ],
      },
      /overlap/
    );
    const ok = cleanVenuePricing({
      model: 'PER_SLOT',
      slots: [{ start_time: '18:00', end_time: '20:00', price: 1500, days_of_week: [5, 1, 5] }],
    });
    expect(ok.slots[0].days_of_week).toEqual([1, 5]);
  });

  it('checks every kind of price rule', () => {
    refuses({ ...valid, price_rules: [{ type: 'WEEKDAY_SURCHARGE', mode: 'PERCENT', value: 10, days: [] }] }, /at least one day/);
    refuses({ ...valid, price_rules: [{ type: 'DATE_OVERRIDE', mode: 'FLAT', value: 10, dates: ['2027-02-30'] }] }, /valid dates/);
    refuses({ ...valid, price_rules: [{ type: 'DATE_RANGE', mode: 'FLAT', value: 10, from: '2027-02-05', to: '2027-02-01' }] }, /date range/);
    refuses({ ...valid, price_rules: [{ type: 'WEEKDAY_SURCHARGE', mode: 'PERCENT', value: -101, days: [1] }] }, /-100 and 1000/);
    refuses({ ...valid, price_rules: [{ type: 'NIGHT', mode: 'PERCENT', value: 1 }] }, /unknown rule type/);
  });

  it('refuses negative fees and bad opening hours', () => {
    refuses({ ...valid, cleaning_fee: -1 }, /Cleaning fee/);
    refuses({ ...valid, operating_hours: [{ day: 1, open: '10:00', close: '09:00' }] }, /end must be after/);
    refuses({ ...valid, operating_hours: [{ day: 1, open: '10:00', close: '12:00' }, { day: 1, open: '13:00', close: '14:00' }] }, /one row per day/);
  });
});
