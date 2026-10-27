import { PriceRuleMode, PriceRuleType, VenuePricingModel } from '@/generated/graphql/graphql';
import {
  MODE_ENUM,
  savedRuleInput,
  savedToInput,
  toPricingValues,
  valuesToInput,
  type SavedPricing,
  type SavedRule,
} from '../venue-pricing.mapping';
import type { VenuePricingValues } from '../venue-pricing.types';

const REGULAR = { open: '08:00', close: '22:00' };

const weekday: SavedRule = {
  type: PriceRuleType.WeekdaySurcharge,
  label: 'Weekend',
  days: [5, 6],
  dates: null,
  from: null,
  to: null,
  mode: PriceRuleMode.Percent,
  value: 15,
};
const range: SavedRule = {
  type: PriceRuleType.DateRange,
  label: null,
  days: null,
  dates: null,
  from: '2026-12-20',
  to: '2027-01-02',
  mode: PriceRuleMode.Flat,
  value: 250,
};
const override: SavedRule = {
  type: PriceRuleType.DateOverride,
  label: 'Diwali',
  days: [],
  dates: ['2026-11-08'],
  from: null,
  to: null,
  mode: PriceRuleMode.Flat,
  value: 1000,
};

const saved = (patch: Partial<SavedPricing> = {}): SavedPricing =>
  ({
    model: VenuePricingModel.PerSlot,
    configured: true,
    base_rate: 500,
    min_pax: 2,
    max_pax: 12,
    min_hours: 1,
    max_hours: 6,
    booking_increment_minutes: 30,
    min_spend: 100,
    slots: [{ start_time: '10:00', end_time: '12:00', price: 900, days_of_week: [1, 2] }],
    operating_hours: [
      { day: 1, open: '09:00', close: '18:00' },
      { day: 3, open: '10:00', close: '20:00' },
    ],
    price_rules: [weekday, range, override],
    deposit: 200,
    cleaning_fee: 50,
    pet_fee: 25,
    gst_enabled: true,
    blocked_dates: ['2026-12-25'],
    ...patch,
  }) as SavedPricing;

describe('toPricingValues', () => {
  it('turns the saved pricing into string fields', () => {
    const values = toPricingValues(saved(), REGULAR);
    expect(values).toMatchObject({
      model: 'PER_SLOT',
      base_rate: '500',
      min_pax: '2',
      max_pax: '12',
      min_hours: '1',
      max_hours: '6',
      booking_increment_minutes: '30',
      min_spend: '100',
      deposit: '200',
      cleaning_fee: '50',
      pet_fee: '25',
      gst_enabled: true,
    });
    expect(values.slots).toEqual([
      { start_time: '10:00', end_time: '12:00', price: '900', days_of_week: [1, 2] },
    ]);
  });

  it('lists all seven weekdays, opening the saved ones and defaulting the rest to regular hours', () => {
    const { hours } = toPricingValues(saved(), REGULAR);
    expect(hours.map((row) => row.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(hours[1]).toEqual({ day: 1, open: true, from: '09:00', to: '18:00' });
    expect(hours[3]).toEqual({ day: 3, open: true, from: '10:00', to: '20:00' });
    expect(hours[0]).toEqual({ day: 0, open: false, from: '08:00', to: '22:00' });
    expect(hours.filter((row) => row.open)).toHaveLength(2);
  });

  it('keeps single-date prices out of the form and fills the blanks of the other rules', () => {
    const { rules } = toPricingValues(saved(), REGULAR);
    expect(rules).toEqual([
      {
        type: 'WEEKDAY_SURCHARGE',
        label: 'Weekend',
        days: [5, 6],
        from: '',
        to: '',
        mode: 'PERCENT',
        value: '15',
      },
      {
        type: 'DATE_RANGE',
        label: '',
        days: [],
        from: '2026-12-20',
        to: '2027-01-02',
        mode: 'FLAT',
        value: '250',
      },
    ]);
  });

  it('leaves the model empty when the venue has none yet', () => {
    expect(toPricingValues(saved({ model: null }), REGULAR).model).toBe('');
  });
});

describe('savedRuleInput', () => {
  it('sends a saved rule back as it is, with missing lists emptied', () => {
    expect(savedRuleInput(override)).toEqual({
      type: PriceRuleType.DateOverride,
      label: 'Diwali',
      days: [],
      dates: ['2026-11-08'],
      from: null,
      to: null,
      mode: PriceRuleMode.Flat,
      value: 1000,
    });
    expect(savedRuleInput(range)).toMatchObject({
      label: '',
      days: [],
      dates: [],
      from: '2026-12-20',
    });
  });
});

describe('savedToInput', () => {
  it('rebuilds the whole pricing as an input', () => {
    const input = savedToInput(saved());
    expect(input).toMatchObject({
      model: VenuePricingModel.PerSlot,
      base_rate: 500,
      deposit: 200,
      gst_enabled: true,
      blocked_dates: ['2026-12-25'],
    });
    expect(input.slots).toEqual([
      { start_time: '10:00', end_time: '12:00', price: 900, days_of_week: [1, 2] },
    ]);
    expect(input.operating_hours).toEqual([
      { day: 1, open: '09:00', close: '18:00' },
      { day: 3, open: '10:00', close: '20:00' },
    ]);
    expect(input.price_rules).toHaveLength(3);
  });

  it('takes the calendar-owned parts from the patch when given', () => {
    const input = savedToInput(saved(), { price_rules: [], blocked_dates: ['2027-01-01'] });
    expect(input.price_rules).toEqual([]);
    expect(input.blocked_dates).toEqual(['2027-01-01']);
  });

  it('sends a null model when the venue has none', () => {
    expect(savedToInput(saved({ model: null })).model).toBeNull();
  });
});

describe('valuesToInput', () => {
  const values = (patch: Partial<VenuePricingValues> = {}): VenuePricingValues => ({
    ...toPricingValues(saved(), REGULAR),
    ...patch,
  });

  it('turns the form back into numbers and keeps only open weekdays', () => {
    const input = valuesToInput(
      values({ base_rate: '650', min_pax: '3', gst_enabled: false }),
      saved(),
    );
    expect(input).toMatchObject({
      model: VenuePricingModel.PerSlot,
      base_rate: 650,
      min_pax: 3,
      max_pax: 12,
      min_hours: 1,
      max_hours: 6,
      booking_increment_minutes: 30,
      min_spend: 100,
      deposit: 200,
      cleaning_fee: 50,
      pet_fee: 25,
      gst_enabled: false,
      blocked_dates: ['2026-12-25'],
    });
    expect(input.operating_hours).toEqual([
      { day: 1, open: '09:00', close: '18:00' },
      { day: 3, open: '10:00', close: '20:00' },
    ]);
  });

  it('sends the form slots for a per-slot venue', () => {
    const edited = values({
      slots: [{ start_time: '11:00', end_time: '13:00', price: '1200', days_of_week: [0] }],
    });
    expect(valuesToInput(edited, saved()).slots).toEqual([
      { start_time: '11:00', end_time: '13:00', price: 1200, days_of_week: [0] },
    ]);
  });

  it('sends the last saved slots back untouched for any other model', () => {
    const edited = values({
      model: 'FLAT',
      slots: [{ start_time: '01:00', end_time: '02:00', price: '1', days_of_week: [0] }],
    });
    const input = valuesToInput(edited, saved());
    expect(input.model).toBe(VenuePricingModel.Flat);
    expect(input.slots).toEqual([
      { start_time: '10:00', end_time: '12:00', price: 900, days_of_week: [1, 2] },
    ]);
  });

  it('sends a null model when none is chosen', () => {
    expect(valuesToInput(values({ model: '' }), saved()).model).toBeNull();
  });

  it('maps form rules and appends the calendar-owned single-date prices from the saved pricing', () => {
    const edited = values({
      rules: [
        {
          type: 'WEEKDAY_SURCHARGE',
          label: '  Late  ',
          days: [4],
          from: '2026-01-01',
          to: '2026-01-02',
          mode: 'PERCENT',
          value: '20',
        },
        {
          type: 'DATE_RANGE',
          label: 'Winter',
          days: [1],
          from: '2026-12-01',
          to: '2026-12-10',
          mode: 'FLAT',
          value: '-75',
        },
      ],
    });
    expect(valuesToInput(edited, saved()).price_rules).toEqual([
      {
        type: PriceRuleType.WeekdaySurcharge,
        label: 'Late',
        days: [4],
        dates: [],
        from: null,
        to: null,
        mode: PriceRuleMode.Percent,
        value: 20,
      },
      {
        type: PriceRuleType.DateRange,
        label: 'Winter',
        days: [],
        dates: [],
        from: '2026-12-01',
        to: '2026-12-10',
        mode: PriceRuleMode.Flat,
        value: -75,
      },
      savedRuleInput(override),
    ]);
  });
});

describe('MODE_ENUM', () => {
  it('maps both rule modes', () => {
    expect(MODE_ENUM).toEqual({ PERCENT: PriceRuleMode.Percent, FLAT: PriceRuleMode.Flat });
  });
});
