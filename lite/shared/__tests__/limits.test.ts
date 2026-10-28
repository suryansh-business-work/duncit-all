import { describe, expect, it } from 'vitest';
import { SETTING_BOUNDS, countIssue } from '../limits';

describe('SETTING_BOUNDS', () => {
  it('holds the outer bounds the API and both forms enforce', () => {
    expect(SETTING_BOUNDS).toEqual({
      ticketPrice: { min: 0, max: 10_000_000 },
      eventCapacity: { min: 1, max: 1_000_000 },
      seatsPerRegistration: { min: 1, max: 100 },
      reminderHour: { min: 1, max: 720 },
      sortOrder: { min: 0, max: 9999 },
    });
  });
});

describe('countIssue', () => {
  const seats = SETTING_BOUNDS.seatsPerRegistration;

  it('accepts a whole number inside the range, both ends included, ignoring outer spaces', () => {
    expect(countIssue('1', seats)).toBeNull();
    expect(countIssue('100', seats)).toBeNull();
    expect(countIssue('  42  ', seats)).toBeNull();
  });

  it('reports a minus sign as negative before anything else', () => {
    expect(countIssue('-1', seats)).toBe('negative');
    expect(countIssue(' -0', seats)).toBe('negative');
    expect(countIssue('-abc', seats)).toBe('negative');
  });

  it('reports anything other than plain digits as not whole', () => {
    for (const raw of ['', '   ', '1.5', '1e3', '12abc', '+5', '1,000']) expect(countIssue(raw, seats)).toBe('notWhole');
  });

  it('reports values below the minimum and above the maximum', () => {
    expect(countIssue('0', seats)).toBe('belowMin');
    expect(countIssue('101', seats)).toBe('aboveMax');
  });

  it('allows zero where zero is the floor, such as a free ticket', () => {
    expect(countIssue('0', SETTING_BOUNDS.ticketPrice)).toBeNull();
    expect(countIssue('10000000', SETTING_BOUNDS.ticketPrice)).toBeNull();
    expect(countIssue('10000001', SETTING_BOUNDS.ticketPrice)).toBe('aboveMax');
  });
});
