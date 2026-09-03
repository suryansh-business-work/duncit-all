import { describe, expect, it } from 'vitest';
import { fmtWhen } from '../queries';

describe('pod-monitoring queries — fmtWhen', () => {
  it('formats a real ISO timestamp through the admin-configured formatter', () => {
    const formatted = fmtWhen('2026-03-04T10:15:00.000Z');
    expect(formatted).not.toBe('—');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('dashes out a null timestamp', () => {
    expect(fmtWhen(null)).toBe('—');
  });

  it('dashes out an undefined timestamp', () => {
    expect(fmtWhen(undefined)).toBe('—');
  });

  it('dashes out an empty-string timestamp', () => {
    expect(fmtWhen('')).toBe('—');
  });
});
