import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  ageInYears,
  birthYearToDob,
  dobMinAgeMessage,
  dobToBirthYear,
  isEligibleBirthYear,
  isEligibleDob,
  latestEligibleBirthYear,
  latestEligibleDob,
} from '../src/age';

/** A fixed "today" so the calendar rules can be asserted exactly. */
const TODAY = new Date(2026, 7, 30); // 30 Aug 2026, local

describe('ageInYears', () => {
  it('counts completed years, not elapsed milliseconds', () => {
    expect(ageInYears('2000-08-30', TODAY)).toBe(26);
  });

  it('does not count a birthday that has not come round yet this year', () => {
    expect(ageInYears('2000-08-31', TODAY)).toBe(25);
    expect(ageInYears('2000-12-01', TODAY)).toBe(25);
  });

  it('counts the birthday itself — someone is 18 ON the day', () => {
    expect(ageInYears('2008-08-30', TODAY)).toBe(18);
  });

  it('is exact across a leap day, where a milliseconds-per-year division drifts', () => {
    expect(ageInYears('2008-02-29', new Date(2026, 1, 28))).toBe(17);
    expect(ageInYears('2008-02-29', new Date(2026, 2, 1))).toBe(18);
  });

  it('accepts a Date, an epoch number and an ISO string alike', () => {
    const dob = new Date(2000, 7, 30);

    expect(ageInYears(dob, TODAY)).toBe(26);
    expect(ageInYears(dob.getTime(), TODAY)).toBe(26);
    expect(ageInYears('2000-08-30', TODAY)).toBe(26);
  });

  it('treats the epoch as a real timestamp rather than as empty', () => {
    // 1970, so somewhere around 56 — the exact number depends on which side of
    // midnight the runner's zone puts the epoch, and that is not the point.
    expect(ageInYears(0, TODAY)).toBeGreaterThan(50);
  });

  it.each([[null], [undefined], ['']])('returns null for %j', (dob) => {
    expect(ageInYears(dob, TODAY)).toBeNull();
  });

  it('returns null for an unparseable date rather than a nonsense number', () => {
    expect(ageInYears('not-a-date', TODAY)).toBeNull();
    expect(ageInYears(Number.NaN, TODAY)).toBeNull();
  });

  it('is negative for a date in the future, which callers gate on', () => {
    expect(ageInYears('2030-01-01', TODAY)).toBeLessThan(0);
  });

  it('falls back to the device’s own today when no reference is given', () => {
    expect(ageInYears(new Date())).toBe(0);
  });

  it('falls back to today when the reference itself is unparseable', () => {
    expect(ageInYears(new Date(), 'nonsense')).toBe(0);
  });
});

describe('latestEligibleDob', () => {
  it('is the most recent birth date still old enough — the picker’s maxDate', () => {
    expect(latestEligibleDob(18, TODAY)).toEqual(new Date(2008, 7, 30));
  });

  it('uses the shared default when the admin setting has not loaded', () => {
    expect(latestEligibleDob(undefined, TODAY)).toEqual(latestEligibleDob(DEFAULT_MIN_ACCOUNT_AGE_YEARS, TODAY));
  });

  it('steps back to 28 Feb rather than offering 1 Mar, which the age check would reject', () => {
    // 29 Feb 2024 minus 18 years is 2006, not a leap year.
    expect(latestEligibleDob(18, new Date(2024, 1, 29))).toEqual(new Date(2006, 1, 28));
  });

  it('always names a date that is itself eligible', () => {
    for (const minAge of [13, 18, 21]) {
      expect(isEligibleDob(latestEligibleDob(minAge, TODAY), minAge, TODAY)).toBe(true);
    }
  });

  it('names a date one day past which is NOT eligible', () => {
    const latest = latestEligibleDob(18, TODAY);
    const dayAfter = new Date(latest.getFullYear(), latest.getMonth(), latest.getDate() + 1);

    expect(isEligibleDob(dayAfter, 18, TODAY)).toBe(false);
  });

  it('falls back to the device’s own today', () => {
    expect(latestEligibleDob(0)).toBeInstanceOf(Date);
  });
});

describe('isEligibleDob', () => {
  it('accepts someone old enough and refuses someone who is not', () => {
    expect(isEligibleDob('2000-01-01', 18, TODAY)).toBe(true);
    expect(isEligibleDob('2010-01-01', 18, TODAY)).toBe(false);
  });

  it('honours an admin threshold other than the default', () => {
    expect(isEligibleDob('2010-01-01', 13, TODAY)).toBe(true);
    expect(isEligibleDob('2010-01-01', 21, TODAY)).toBe(false);
  });

  it('refuses an unparseable or future date — "empty" is the caller’s to check', () => {
    expect(isEligibleDob('', 18, TODAY)).toBe(false);
    expect(isEligibleDob('not-a-date', 18, TODAY)).toBe(false);
    expect(isEligibleDob('2030-01-01', 18, TODAY)).toBe(false);
  });
});

describe('dobMinAgeMessage', () => {
  it('says the same thing on every surface, with the configured number in it', () => {
    expect(dobMinAgeMessage(21)).toBe('You must be at least 21 years old to join Duncit');
    expect(dobMinAgeMessage()).toContain(String(DEFAULT_MIN_ACCOUNT_AGE_YEARS));
  });
});

describe('year-only dates of birth', () => {
  // A fixed "today" so the expectations do not rot with the calendar.
  const SEP = new Date(2026, 8, 1); // 1 September 2026

  it('offers the newest year that is old enough', () => {
    expect(latestEligibleBirthYear(18, SEP)).toBe(2008);
    expect(latestEligibleBirthYear(21, SEP)).toBe(2005);
  });

  it('defaults the minimum age to the shared constant', () => {
    expect(latestEligibleBirthYear(undefined, SEP)).toBe(
      2026 - DEFAULT_MIN_ACCOUNT_AGE_YEARS,
    );
  });

  it('accepts the cut-off year and everything before it', () => {
    expect(isEligibleBirthYear(2008, 18, SEP)).toBe(true);
    expect(isEligibleBirthYear('1998', 18, SEP)).toBe(true);
  });

  it('rejects a year too recent to be old enough', () => {
    expect(isEligibleBirthYear(2009, 18, SEP)).toBe(false);
    expect(isEligibleBirthYear(2030, 18, SEP)).toBe(false);
  });

  it('rejects anything that is not a whole year', () => {
    expect(isEligibleBirthYear('', 18, SEP)).toBe(false);
    expect(isEligibleBirthYear('nineteen', 18, SEP)).toBe(false);
    expect(isEligibleBirthYear(Number.NaN, 18, SEP)).toBe(false);
  });

  it('defaults its minimum age too', () => {
    expect(isEligibleBirthYear(1990, undefined, SEP)).toBe(true);
  });

  it('stores a year as the first of January, which is what the server re-checks', () => {
    expect(birthYearToDob(2001)).toBe('2001-01-01');
    expect(birthYearToDob(' 1999 ')).toBe('1999-01-01');
    // The round trip the profile editor makes when it reads a stored date back.
    expect(isEligibleDob(birthYearToDob(2008), 18, SEP)).toBe(true);
  });

  it('reads the year back out of a stored date, and says so when there is none', () => {
    expect(dobToBirthYear('1998-04-23')).toBe('1998');
    expect(dobToBirthYear('')).toBe('');
    expect(dobToBirthYear(null)).toBe('');
    expect(dobToBirthYear('not-a-date')).toBe('');
  });
});
