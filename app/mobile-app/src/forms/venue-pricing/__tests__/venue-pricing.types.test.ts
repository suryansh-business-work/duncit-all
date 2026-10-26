import {
  makeDateOverrideSchema,
  makeVenuePricingSchema,
  type DayHoursValues,
  type PriceRuleValues,
  type PricingSlotValues,
  type VenuePricingValues,
} from '../venue-pricing.types';

const t = (key: string) => key;
const V = 'availability.pricingModule.validation.';
const schema = makeVenuePricingSchema(t);

const base = (patch: Partial<VenuePricingValues> = {}): VenuePricingValues => ({
  model: 'PER_PAX',
  base_rate: '500',
  min_pax: '2',
  max_pax: '10',
  min_hours: '1',
  max_hours: '4',
  booking_increment_minutes: '30',
  min_spend: '0',
  deposit: '0',
  cleaning_fee: '0',
  pet_fee: '0',
  gst_enabled: true,
  slots: [],
  hours: [],
  rules: [],
  ...patch,
});

const slot = (patch: Partial<PricingSlotValues> = {}): PricingSlotValues => ({
  start_time: '10:00',
  end_time: '12:00',
  price: '800',
  days_of_week: [1],
  ...patch,
});

const rule = (patch: Partial<PriceRuleValues> = {}): PriceRuleValues => ({
  type: 'WEEKDAY_SURCHARGE',
  label: 'Weekend',
  days: [5],
  from: '',
  to: '',
  mode: 'PERCENT',
  value: '10',
  ...patch,
});

const day = (patch: Partial<DayHoursValues> = {}): DayHoursValues => ({
  day: 1,
  open: true,
  from: '09:00',
  to: '18:00',
  ...patch,
});

const problems = (values: VenuePricingValues) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}|${i.message}`);
};

describe('makeVenuePricingSchema', () => {
  it('accepts a complete per-pax form', () => {
    expect(schema.safeParse(base()).success).toBe(true);
  });

  it('accepts a per-slot form with valid slots and no base rate', () => {
    expect(
      schema.safeParse(base({ model: 'PER_SLOT', base_rate: '0', slots: [slot()] })).success,
    ).toBe(true);
  });

  it('accepts open hours, a weekday rule and a dated rule', () => {
    const values = base({
      hours: [day(), day({ day: 0, open: false, from: '', to: '' })],
      rules: [
        rule(),
        rule({
          type: 'DATE_RANGE',
          days: [],
          from: '2026-12-01',
          to: '2026-12-31',
          mode: 'FLAT',
          value: '-50',
        }),
      ],
    });
    expect(schema.safeParse(values).success).toBe(true);
  });

  describe('field checks', () => {
    it('asks for a model before anything else', () => {
      expect(problems(base({ model: '' }))).toEqual([`model|${V}modelRequired`]);
    });

    it('rejects blank, negative and non-numeric amounts', () => {
      expect(problems(base({ min_spend: '' }))).toContain(`min_spend|${V}amount`);
      expect(problems(base({ deposit: '-1' }))).toContain(`deposit|${V}amount`);
      expect(problems(base({ cleaning_fee: 'abc' }))).toContain(`cleaning_fee|${V}amount`);
      expect(problems(base({ pet_fee: ' ' }))).toContain(`pet_fee|${V}amount`);
    });

    it('rejects fractional or negative whole numbers', () => {
      expect(problems(base({ max_pax: '2.5' }))).toContain(`max_pax|${V}wholeNumber`);
      expect(problems(base({ booking_increment_minutes: '-15' }))).toContain(
        `booking_increment_minutes|${V}wholeNumber`,
      );
    });

    it('keeps hours between 0 and 24 inclusive', () => {
      expect(problems(base({ min_hours: '24', max_hours: '24' }))).toEqual([]);
      expect(problems(base({ min_hours: '0', max_hours: '25' }))).toContain(
        `max_hours|${V}hoursRange`,
      );
      expect(problems(base({ min_hours: '' }))).toContain(`min_hours|${V}hoursRange`);
    });
  });

  describe('limits', () => {
    it('requires a positive rate for every model except per slot', () => {
      expect(problems(base({ base_rate: '0' }))).toContain(`base_rate|${V}rateRequired`);
      expect(problems(base({ model: 'FLAT', base_rate: '' }))).toContain(
        `base_rate|${V}rateRequired`,
      );
      expect(problems(base({ model: 'PER_SLOT', base_rate: '', slots: [slot()] }))).not.toContain(
        `base_rate|${V}rateRequired`,
      );
    });

    it('needs at least one guest for a per-pax price, but not for other models', () => {
      expect(problems(base({ min_pax: '0' }))).toContain(`min_pax|${V}minPaxOne`);
      expect(problems(base({ model: 'FLAT', min_pax: '0', max_pax: '0' }))).toEqual([]);
    });

    it('keeps the guest ceiling at or above the floor, and zero means no ceiling', () => {
      expect(problems(base({ min_pax: '5', max_pax: '3' }))).toContain(`max_pax|${V}maxPax`);
      expect(problems(base({ min_pax: '5', max_pax: '5' }))).toEqual([]);
      expect(problems(base({ min_pax: '5', max_pax: '0' }))).toEqual([]);
    });

    it('keeps the longest booking at or above the shortest', () => {
      expect(problems(base({ min_hours: '3', max_hours: '2' }))).toContain(
        `max_hours|${V}maxHours`,
      );
      expect(problems(base({ min_hours: '3', max_hours: '0' }))).toEqual([]);
    });

    it('checks the booking step only for hourly venues', () => {
      const hourly = (step: string) => base({ model: 'PER_HOUR', booking_increment_minutes: step });
      expect(problems(hourly('30'))).toEqual([]);
      expect(problems(hourly('10'))).toContain(`booking_increment_minutes|${V}increment`);
      expect(problems(hourly('20'))).toContain(`booking_increment_minutes|${V}increment`);
      expect(problems(base({ booking_increment_minutes: '7' }))).toEqual([]);
    });

    it('needs a slot for a per-slot venue', () => {
      expect(problems(base({ model: 'PER_SLOT', slots: [] }))).toContain(`slots|${V}slotRequired`);
    });
  });

  describe('slots', () => {
    const perSlot = (slots: PricingSlotValues[]) => base({ model: 'PER_SLOT', slots });

    it('flags a slot missing a time', () => {
      expect(problems(perSlot([slot({ start_time: '' })]))).toEqual([
        `slots.0.end_time|${V}timeRequired`,
      ]);
      expect(problems(perSlot([slot({ end_time: '' })]))).toEqual([
        `slots.0.end_time|${V}timeRequired`,
      ]);
    });

    it('flags an end that is not after the start', () => {
      expect(problems(perSlot([slot({ end_time: '10:00' })]))).toEqual([
        `slots.0.end_time|${V}endAfterStart`,
      ]);
      expect(problems(perSlot([slot(), slot({ start_time: '14:00', end_time: '13:00' })]))).toEqual(
        [`slots.1.end_time|${V}endAfterStart`],
      );
    });

    it('flags a bad price and a slot with no days', () => {
      expect(problems(perSlot([slot({ price: '' })]))).toEqual([`slots.0.price|${V}amount`]);
      expect(problems(perSlot([slot({ days_of_week: [] })]))).toEqual([
        `slots.0.days_of_week|${V}pickDays`,
      ]);
    });

    it('leaves saved slots alone for other models', () => {
      expect(problems(base({ slots: [slot({ price: '', days_of_week: [] })] }))).toEqual([]);
    });
  });

  describe('opening hours', () => {
    it('flags an open day with a missing or reversed range', () => {
      expect(problems(base({ hours: [day({ from: '' })] }))).toEqual([
        `hours.0.to|${V}endAfterStart`,
      ]);
      expect(problems(base({ hours: [day({ to: '' })] }))).toEqual([
        `hours.0.to|${V}endAfterStart`,
      ]);
      expect(problems(base({ hours: [day({ to: '09:00' })] }))).toEqual([
        `hours.0.to|${V}endAfterStart`,
      ]);
    });

    it('ignores a closed day whatever its times say', () => {
      expect(problems(base({ hours: [day({ open: false, from: '', to: '' })] }))).toEqual([]);
    });
  });

  describe('rules', () => {
    it('needs a numeric value', () => {
      expect(problems(base({ rules: [rule({ value: '' })] }))).toEqual([
        `rules.0.value|${V}ruleValue`,
      ]);
    });

    it('keeps a percent between -100 and 1000 but lets a flat amount be any number', () => {
      expect(problems(base({ rules: [rule({ value: '-100' })] }))).toEqual([]);
      expect(problems(base({ rules: [rule({ value: '1000' })] }))).toEqual([]);
      expect(problems(base({ rules: [rule({ value: '-101' })] }))).toEqual([
        `rules.0.value|${V}percentRange`,
      ]);
      expect(problems(base({ rules: [rule({ value: '1001' })] }))).toEqual([
        `rules.0.value|${V}percentRange`,
      ]);
      expect(problems(base({ rules: [rule({ mode: 'FLAT', value: '5000' })] }))).toEqual([]);
    });

    it('needs days for a weekday surcharge', () => {
      expect(problems(base({ rules: [rule({ days: [] })] }))).toEqual([
        `rules.0.days|${V}pickDays`,
      ]);
    });

    it('needs an ordered date range for a dated rule', () => {
      const ranged = (from: string, to: string) =>
        base({ rules: [rule({ type: 'DATE_RANGE', days: [], from, to })] });
      expect(problems(ranged('', '2026-12-31'))).toEqual([`rules.0.to|${V}rangeDates`]);
      expect(problems(ranged('2026-12-01', ''))).toEqual([`rules.0.to|${V}rangeDates`]);
      expect(problems(ranged('2026-12-31', '2026-12-01'))).toEqual([`rules.0.to|${V}rangeDates`]);
      expect(problems(ranged('2026-12-01', '2026-12-01'))).toEqual([]);
    });
  });
});

describe('makeDateOverrideSchema', () => {
  const overrideSchema = makeDateOverrideSchema(t);
  const run = (mode: 'PERCENT' | 'FLAT', value: string) => {
    const result = overrideSchema.safeParse({ mode, value });
    return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}|${i.message}`);
  };

  it('accepts a percent or a flat change', () => {
    expect(run('PERCENT', '25')).toEqual([]);
    expect(run('FLAT', '-200')).toEqual([]);
  });

  it('rejects a blank or non-numeric value', () => {
    expect(run('FLAT', '')).toEqual([`value|${V}ruleValue`]);
    expect(run('PERCENT', 'x')).toEqual([`value|${V}ruleValue`]);
  });

  it('keeps a percent in range', () => {
    expect(run('PERCENT', '-101')).toEqual([`value|${V}percentRange`]);
    expect(run('PERCENT', '1001')).toEqual([`value|${V}percentRange`]);
    expect(run('FLAT', '1001')).toEqual([]);
  });
});
