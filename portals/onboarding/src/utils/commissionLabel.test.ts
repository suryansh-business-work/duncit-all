import { describe, expect, it } from 'vitest';
import { commissionLabel } from './commissionLabel';

describe('commissionLabel', () => {
  it('formats a positive override as a percentage', () => {
    expect(commissionLabel(12)).toBe('12%');
    expect(commissionLabel(2.5)).toBe('2.5%');
  });

  it('falls back to Default for 0, null and undefined', () => {
    expect(commissionLabel(0)).toBe('Default');
    expect(commissionLabel(null)).toBe('Default');
    expect(commissionLabel(undefined)).toBe('Default');
  });
});
