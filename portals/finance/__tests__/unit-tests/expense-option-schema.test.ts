/**
 * Validation and value mapping for one Expense Settings option.
 *
 * The stored KEY is what every expense filed under the option carries, so the
 * live preview has to say exactly what the server will store.
 */
import { describe, expect, it } from 'vitest';
import {
  expenseOptionSchema,
  toFormValues,
  toOptionKey,
} from '../../src/pages/finance/expense-settings-page/expense-option-form';
import { makeOptionRow } from '../mocks/expense-settings.mock';

const messageFor = (input: unknown, field: string) => {
  const result = expenseOptionSchema().safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe('expenseOptionSchema', () => {
  it('reads its messages out of the shipped copy when no translator is passed', () => {
    expect(messageFor({ key: ' ', label: 'Rent' }, 'key')).toBe('Give the option a key');
    expect(messageFor({ key: 'RENT', label: '' }, 'label')).toBe('Give the option a display name');
    expect(messageFor({ key: 'K'.repeat(61), label: 'Rent' }, 'key')).toBe('Too long');
    expect(messageFor({ key: 'RENT', label: 'L'.repeat(121) }, 'label')).toBe('Too long');
  });

  it('fills the optional fields and trims what was typed', () => {
    expect(expenseOptionSchema().parse({ key: '  RENT ', label: ' Rent ' })).toEqual({
      key: 'RENT',
      label: 'Rent',
      entity_source: '',
      is_active: true,
    });
  });
});

describe('toOptionKey / toFormValues', () => {
  it('previews the CONSTANT_CASE key the server stores', () => {
    expect(toOptionKey('  Food & Beverage ')).toBe('FOOD_BEVERAGE');
    expect(toOptionKey('--event partner--')).toBe('EVENT_PARTNER');
  });

  it('starts a new option offered, and an edit on the saved row', () => {
    expect(toFormValues(null)).toEqual({ key: '', label: '', entity_source: '', is_active: true });
    expect(toFormValues(makeOptionRow({ is_active: false }))).toEqual({
      key: 'VENUE',
      label: 'Venue',
      entity_source: 'VENUE',
      is_active: false,
    });
  });
});
