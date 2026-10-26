import { readVenueSettings } from '@duncit/slots';

import {
  initialRecurringForm,
  newTimeRange,
  seedSpaces,
  spaceSeedKey,
  toInt,
  toRecurringConfig,
  type RecurringForm,
  type SpaceRow,
} from '../recurring-form';

describe('newTimeRange', () => {
  it('starts as the 1 pm hour by default, each with its own id', () => {
    const first = newTimeRange();
    const second = newTimeRange();
    expect(first).toMatchObject({ start: '13:00', end: '14:00' });
    expect(first.id).not.toBe(second.id);
  });

  it('takes the times it is given', () => {
    expect(newTimeRange('09:00', '10:30')).toMatchObject({ start: '09:00', end: '10:30' });
  });
});

describe('seedSpaces', () => {
  it('makes one enabled, default-priced row per named capacity item', () => {
    expect(
      seedSpaces(
        [
          { label: 'Court 1', capacity: 4 },
          { label: 'Court 2', capacity: 8 },
        ],
        100,
      ),
    ).toEqual([
      { label: 'Court 1', capacity: 4, price: '399', enabled: true },
      { label: 'Court 2', capacity: 8, price: '399', enabled: true },
    ]);
  });

  it('falls back to one whole-venue row holding the venue capacity', () => {
    expect(seedSpaces([], 24)).toEqual([{ label: '', capacity: 24, price: '399', enabled: true }]);
  });

  it('rounds a fractional venue capacity', () => {
    expect(seedSpaces([], 24.6)[0]?.capacity).toBe(25);
  });

  it.each([
    ['negative', -5],
    ['not a number', Number.NaN],
  ])('treats a %s venue capacity as zero', (_label, capacity) => {
    expect(seedSpaces([], capacity)[0]?.capacity).toBe(0);
  });
});

describe('initialRecurringForm', () => {
  const spaces: SpaceRow[] = [{ label: 'Court 1', capacity: 4, price: '300', enabled: false }];

  it('starts with no dates, every weekday, one window and both skips on', () => {
    const form = initialRecurringForm(spaces);
    expect(form).toMatchObject({
      startDate: null,
      endDate: null,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      wholeDay: false,
      skipWeeklyOff: true,
      skipHolidays: true,
      conflictMode: 'SKIP',
    });
    expect(form.timeSlots).toHaveLength(1);
    expect(form.timeSlots[0]).toMatchObject({ start: '13:00', end: '14:00' });
  });

  it('copies the spaces so editing the form never edits the seed', () => {
    const form = initialRecurringForm(spaces);
    expect(form.spaces).toEqual(spaces);
    expect(form.spaces[0]).not.toBe(spaces[0]);
  });
});

describe('toInt', () => {
  it.each([
    ['399', 399],
    ['12.6', 13],
    ['', 0],
    ['abc', 0],
    ['-4', 0],
  ])('reads %j as %d', (raw, expected) => {
    expect(toInt(raw)).toBe(expected);
  });
});

describe('spaceSeedKey', () => {
  it('identifies the spaces by label and capacity, not by price or toggle', () => {
    const a: SpaceRow[] = [
      { label: 'Court 1', capacity: 4, price: '1', enabled: true },
      { label: 'Court 2', capacity: 8, price: '2', enabled: true },
    ];
    const b = a.map((space) => ({ ...space, price: '999', enabled: false }));
    expect(spaceSeedKey(a)).toBe('Court 1:4|Court 2:8');
    expect(spaceSeedKey(b)).toBe(spaceSeedKey(a));
  });

  it('changes when a capacity changes, and is empty for no spaces', () => {
    expect(spaceSeedKey([{ label: 'Court 1', capacity: 5, price: '1', enabled: true }])).toBe(
      'Court 1:5',
    );
    expect(spaceSeedKey([])).toBe('');
  });
});

describe('toRecurringConfig', () => {
  const settings = readVenueSettings({});
  const form: RecurringForm = {
    startDate: new Date(2030, 0, 1),
    endDate: new Date(2030, 0, 31),
    weekdays: [6, 0],
    wholeDay: false,
    timeSlots: [
      { id: 'a', start: '10:00', end: '11:00' },
      { id: 'b', start: '12:00', end: '13:00' },
    ],
    spaces: [
      { label: 'Court 1', capacity: 4.4, price: '300.4', enabled: true },
      { label: 'Court 2', capacity: 8, price: '500', enabled: false },
      { label: 'Court 3', capacity: 6, price: '   ', enabled: true },
      { label: 'Court 4', capacity: -2, price: '250', enabled: true },
    ],
    skipWeeklyOff: false,
    skipHolidays: true,
    conflictMode: 'REPLACE',
  };

  it('copies the dates, days and skips, dropping the row ids from the windows', () => {
    const config = toRecurringConfig(form, settings);
    expect(config).toMatchObject({
      startDate: form.startDate,
      endDate: form.endDate,
      weekdays: [6, 0],
      wholeDay: false,
      skipWeeklyOff: false,
      skipHolidays: true,
      bufferMinutes: settings.rules.buffer_minutes,
    });
    expect(config.timeSlots).toEqual([
      { start: '10:00', end: '11:00' },
      { start: '12:00', end: '13:00' },
    ]);
  });

  it('sends a capacity that is not a number as zero rather than NaN', () => {
    const odd: RecurringForm = {
      ...form,
      spaces: [{ label: 'Court 9', capacity: Number.NaN, price: '100', enabled: true }],
    };
    expect(toRecurringConfig(odd, settings).spaces).toEqual([
      { label: 'Court 9', capacity: 0, price: 100 },
    ]);
  });

  it('generates only for enabled spaces with a filled price, as whole numbers', () => {
    expect(toRecurringConfig(form, settings).spaces).toEqual([
      { label: 'Court 1', capacity: 4, price: 300 },
      { label: 'Court 4', capacity: 0, price: 250 },
    ]);
  });
});
