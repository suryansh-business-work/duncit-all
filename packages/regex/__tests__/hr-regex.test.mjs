import { describe, expect, it } from 'vitest';
// The CommonJS twin is checked against these by lockstep.test.mjs (same patterns, same answers).
import { isLeaveCode, isMonthKey } from '../regex.mjs';

describe('LEAVE_CODE', () => {
  it('takes a capital letter followed by up to 11 capitals, digits or underscores', () => {
    for (const code of ['CL', 'S', 'SICK_2', 'LOP', 'ABCDEFGHIJKL']) expect(isLeaveCode(code)).toBe(true);
  });

  it('refuses lower case, a leading digit or underscore, other symbols and anything over 12 characters', () => {
    for (const code of ['cl', '2CL', '_CL', 'C-L', 'C L', '', 'ABCDEFGHIJKLM']) expect(isLeaveCode(code)).toBe(false);
  });
});

describe('MONTH_KEY', () => {
  it('takes YYYY-MM with a month from 01 to 12', () => {
    for (const month of ['2026-01', '2026-11', '1999-12']) expect(isMonthKey(month)).toBe(true);
  });

  it('refuses month 00 or 13, a short year, a missing pad and a full date', () => {
    for (const month of ['2026-00', '2026-13', '26-11', '2026-1', '2026-11-01', '']) expect(isMonthKey(month)).toBe(false);
  });
});
