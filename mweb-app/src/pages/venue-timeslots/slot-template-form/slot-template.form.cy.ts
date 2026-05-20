import { describe, expect, it } from 'vitest';
import {
  slotTemplateInitialValues,
  slotTemplateSchema,
  toTemplateInput,
} from './slot-template.schema';

const baseWeekly = { ...slotTemplateInitialValues };

describe('slotTemplateSchema', () => {
  it('rejects duration that is not a multiple of 5', async () => {
    const error = await slotTemplateSchema
      .validate({ ...baseWeekly, duration_minutes: 23 }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/5-minute/i);
  });

  it('rejects end_time at or before start_time', async () => {
    const error = await slotTemplateSchema
      .validate({ ...baseWeekly, start_time: '10:00', end_time: '09:00' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/end time/i);
  });

  it('rejects WEEKLY with no weekdays', async () => {
    const error = await slotTemplateSchema
      .validate({ ...baseWeekly, weekdays: [] }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/weekday/i);
  });

  it('rejects MONTHLY with no month_days and no nth-weekday', async () => {
    const error = await slotTemplateSchema
      .validate(
        {
          ...baseWeekly,
          recurrence_kind: 'MONTHLY' as const,
          month_days: [],
          month_nth_weekday: null,
        },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/day of month|nth/i);
  });

  it('rejects SPECIFIC_DATES with empty list', async () => {
    const error = await slotTemplateSchema
      .validate(
        { ...baseWeekly, recurrence_kind: 'SPECIFIC_DATES' as const, specific_dates: [] },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/at least one date/i);
  });

  it('rejects valid_until before valid_from', async () => {
    const error = await slotTemplateSchema
      .validate(
        { ...baseWeekly, valid_from: '2026-01-10', valid_until: '2026-01-05' },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/valid until/i);
  });

  it('accepts a fully valid weekly template', async () => {
    await slotTemplateSchema.validate(baseWeekly);
  });
});

describe('toTemplateInput', () => {
  it('clears weekdays when recurrence is not WEEKLY', () => {
    const input = toTemplateInput({
      ...baseWeekly,
      recurrence_kind: 'SPECIFIC_DATES',
      specific_dates: ['2026-06-10T00:00:00Z'],
    });
    expect(input.weekdays).toEqual([]);
    expect(input.specific_dates.length).toBe(1);
  });

  it('clears month_days when nth-weekday is set', () => {
    const input = toTemplateInput({
      ...baseWeekly,
      recurrence_kind: 'MONTHLY',
      month_days: [1, 15],
      month_nth_weekday: { nth: 2, weekday: 3 },
    });
    expect(input.month_days).toEqual([]);
    expect(input.month_nth_weekday).toEqual({ nth: 2, weekday: 3 });
  });

  it('passes is_active through and ISO-normalizes valid_from', () => {
    const input = toTemplateInput({
      ...baseWeekly,
      valid_from: '2026-06-10',
      is_active: false,
    });
    expect(input.is_active).toBe(false);
    expect(input.valid_from).toMatch(/^2026-06-10/);
  });
});
