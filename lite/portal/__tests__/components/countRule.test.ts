import { describe, expect, it } from 'vitest';
import { SETTING_BOUNDS } from '../../../shared/limits';
import { countMessage, countRule } from '../../components/countRule';
import { portalT } from '../test-utils';

const SEATS = { min: 1, max: 100 };

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }): string | undefined => result.error?.issues[0]?.message;

describe('countMessage', () => {
  it('accepts a whole number inside the range, both bounds included, ignoring surrounding spaces', () => {
    expect(countMessage(portalT, 'Seats', '1', SEATS)).toBeNull();
    expect(countMessage(portalT, 'Seats', '100', SEATS)).toBeNull();
    expect(countMessage(portalT, 'Seats', ' 42 ', SEATS)).toBeNull();
    expect(countMessage(portalT, 'Seats', '007', SEATS)).toBeNull();
  });

  it('names the field when the number is negative, before any other check', () => {
    expect(countMessage(portalT, 'Seats', '-3', SEATS)).toBe('Seats cannot be negative');
    expect(countMessage(portalT, 'Seats', '-0', SEATS)).toBe('Seats cannot be negative');
    expect(countMessage(portalT, 'Seats', '-2.5', SEATS)).toBe('Seats cannot be negative');
  });

  it('refuses decimals, signs, exponents, words and an empty box as not a whole number', () => {
    for (const raw of ['2.5', '+5', '1e3', 'ten', '', '   ']) {
      expect(countMessage(portalT, 'Seats', raw, SEATS)).toBe('Seats must be a whole number');
    }
  });

  it('says the minimum when the number is under it', () => {
    expect(countMessage(portalT, 'Seats', '0', SEATS)).toBe('Seats must be 1 or more');
  });

  it('says the maximum when the number is over it, however large', () => {
    expect(countMessage(portalT, 'Seats', '101', SEATS)).toBe('Seats must be 100 or less');
    expect(countMessage(portalT, 'Seats', '99999999999999999999', SEATS)).toBe('Seats must be 100 or less');
  });
});

describe('countRule', () => {
  it('passes a valid number through trimmed', () => {
    const result = countRule(portalT, 'Sort order', SETTING_BOUNDS.sortOrder).safeParse(' 12 ');
    expect(result.success).toBe(true);
    expect(result.data).toBe('12');
  });

  it('reports the same message countMessage builds, as the only issue', () => {
    const result = countRule(portalT, 'Sort order', SETTING_BOUNDS.sortOrder).safeParse('10000');
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(1);
    expect(firstMessage(result)).toBe('Sort order must be 9999 or less');
  });

  it('refuses an empty box unless blanks are allowed', () => {
    const strict = countRule(portalT, 'Sort order', SETTING_BOUNDS.sortOrder);
    const lenient = countRule(portalT, 'Sort order', SETTING_BOUNDS.sortOrder, true);
    expect(firstMessage(strict.safeParse(''))).toBe('Sort order must be a whole number');
    expect(lenient.safeParse('').success).toBe(true);
    expect(lenient.safeParse('   ').success).toBe(true);
  });

  it('still checks a non-blank value when blanks are allowed', () => {
    const lenient = countRule(portalT, 'Sort order', SETTING_BOUNDS.sortOrder, true);
    expect(firstMessage(lenient.safeParse('-1'))).toBe('Sort order cannot be negative');
    expect(firstMessage(lenient.safeParse('1.5'))).toBe('Sort order must be a whole number');
  });
});
