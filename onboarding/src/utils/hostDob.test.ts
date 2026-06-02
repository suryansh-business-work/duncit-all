import { describe, expect, it } from 'vitest';
import { format, subYears } from 'date-fns';
import {
  getHostDobMaxDate,
  getHostDobMinDate,
  HOST_DOB_MAX_AGE_YEARS,
  HOST_DOB_MIN_AGE_YEARS,
  isValidHostDob,
} from './hostDob';

const iso = (date: Date) => format(date, 'yyyy-MM-dd');

describe('isValidHostDob', () => {
  it('treats empty values as valid (optional field)', () => {
    expect(isValidHostDob('')).toBe(true);
    expect(isValidHostDob(null)).toBe(true);
    expect(isValidHostDob(undefined)).toBe(true);
  });

  it('rejects unparseable dates', () => {
    expect(isValidHostDob('not-a-date')).toBe(false);
  });

  it('accepts a date inside the allowed age range', () => {
    expect(isValidHostDob(iso(subYears(new Date(), 30)))).toBe(true);
  });

  it('rejects ages below the minimum', () => {
    expect(isValidHostDob(iso(subYears(new Date(), HOST_DOB_MIN_AGE_YEARS - 1)))).toBe(false);
  });

  it('rejects ages above the maximum', () => {
    expect(isValidHostDob(iso(subYears(new Date(), HOST_DOB_MAX_AGE_YEARS + 1)))).toBe(false);
  });
});

describe('host dob bounds', () => {
  it('exposes min/max dates derived from the age limits', () => {
    expect(getHostDobMaxDate().getFullYear()).toBe(subYears(new Date(), HOST_DOB_MIN_AGE_YEARS).getFullYear());
    expect(getHostDobMinDate().getFullYear()).toBe(subYears(new Date(), HOST_DOB_MAX_AGE_YEARS).getFullYear());
  });
});
