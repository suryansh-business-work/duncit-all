import { describe, expect, it } from 'vitest';
import { deltaOf, formatValue } from '../../../src/pages/entity-analytics/format';

describe('formatValue', () => {
  it('writes a missing value as an em dash rather than a misleading zero', () => {
    expect(formatValue(null, 'COUNT')).toBe('—');
    expect(formatValue(undefined, 'CURRENCY')).toBe('—');
  });

  it('writes money in rupees, compact past a lakh so a tile never wraps', () => {
    expect(formatValue(1250, 'CURRENCY')).toBe('₹1,250');
    expect(formatValue(250000, 'CURRENCY')).toBe('₹2.5L');
  });

  it('writes a rate as a percentage to one decimal', () => {
    expect(formatValue(12.345, 'PERCENT')).toBe('12.3%');
  });

  it('writes a rating to one decimal, and an unrated zero as a dash', () => {
    expect(formatValue(4.26, 'RATING')).toBe('4.3');
    expect(formatValue(0, 'RATING')).toBe('—');
  });

  it('writes days and plain decimals to one place', () => {
    expect(formatValue(2.5, 'DAYS')).toBe('2.5');
    expect(formatValue(1.25, 'DECIMAL')).toBe('1.3');
  });

  it('writes a count whole, with Indian grouping', () => {
    expect(formatValue(123456.7, 'COUNT')).toBe('1,23,457');
  });
});

describe('deltaOf', () => {
  it('has nothing to compare a live count with', () => {
    expect(deltaOf(42, null, 'COUNT', true)).toBeNull();
    expect(deltaOf(42, undefined, 'COUNT', true)).toBeNull();
  });

  it('calls a change under a twentieth flat, and flat is fine', () => {
    expect(deltaOf(4.42, 4.4, 'RATING', true)).toEqual({ amount: '0', unit: 'plain', good: true, direction: 'flat' });
  });

  it('moves a rate in points, not in percent of itself', () => {
    expect(deltaOf(68.4, 61.2, 'PERCENT', true)).toEqual({
      amount: '+7.2',
      unit: 'points',
      good: true,
      direction: 'up',
    });
  });

  it('moves anything else relative to the period before', () => {
    expect(deltaOf(150000, 200000, 'CURRENCY', true)).toEqual({
      amount: '−25',
      unit: 'percent',
      good: false,
      direction: 'down',
    });
  });

  it('reads a fall as good news when lower is better', () => {
    expect(deltaOf(90, 120, 'COUNT', false)?.good).toBe(true);
  });

  it('reports the plain change when the period before was zero', () => {
    expect(deltaOf(5, 0, 'COUNT', true)).toEqual({ amount: '+5', unit: 'plain', good: true, direction: 'up' });
  });
});

describe('formatValue - units and grades', () => {
  it('writes bytes in the largest unit', () => {
    expect(formatValue(1536, 'BYTES')).toBe('1.5 KB');
  });

  it('writes a duration in the largest unit that keeps it short', () => {
    expect(formatValue(850, 'DURATION')).toBe('850 ms');
    expect(formatValue(12400, 'DURATION')).toMatch(/^12\.4 secs?$/);
    expect(formatValue(2310000, 'DURATION')).toMatch(/^38\.5 mins?$/);
  });

  it('writes SonarQube grades as letters, and an ungraded zero as a dash', () => {
    expect(formatValue(1, 'GRADE')).toBe('A');
    expect(formatValue(2.2, 'GRADE')).toBe('B');
    expect(formatValue(5, 'GRADE')).toBe('E');
    expect(formatValue(0, 'GRADE')).toBe('—');
  });

  it('writes US dollars to the cent, and to a hundredth of a cent under a dollar', () => {
    expect(formatValue(12.5, 'USD')).toBe('$12.50');
    expect(formatValue(0.1234, 'USD')).toBe('$0.1234');
  });
});

describe('deltaOf - grades', () => {
  it('moves a grade in whole steps, not percent of itself', () => {
    expect(deltaOf(3, 2, 'GRADE', false)).toEqual({ amount: '+1', unit: 'plain', good: false, direction: 'up' });
  });
});
