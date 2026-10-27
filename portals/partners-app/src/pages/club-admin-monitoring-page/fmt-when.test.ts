import { describe, expect, it } from 'vitest';
import { fmtWhen } from './queries';

describe('fmtWhen', () => {
  it('shows a dash for a missing time', () => {
    expect(fmtWhen(null)).toBe('—');
    expect(fmtWhen(undefined)).toBe('—');
    expect(fmtWhen('')).toBe('—');
  });

  it('shows a dash for a time that is not a date', () => {
    expect(fmtWhen('not-a-date')).toBe('—');
  });

  it('writes a real time with the configured date and time format', () => {
    expect(fmtWhen('2026-07-01T10:00:00.000Z')).toMatch(/2026/);
  });
});
