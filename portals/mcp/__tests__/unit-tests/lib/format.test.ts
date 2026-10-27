import { describe, expect, it } from 'vitest';
import { formatCost, formatCount, prettyJson } from '../../../src/lib/format';

describe('formatCount', () => {
  it('groups whole numbers the way the locale does', () => {
    expect(formatCount(1234567, 'en-US')).toBe('1,234,567');
    expect(formatCount(1234567, 'en-IN')).toBe('12,34,567');
  });

  it('rounds to a whole count and reads a missing value as zero', () => {
    expect(formatCount(41.6, 'en-US')).toBe('42');
    expect(formatCount(Number.NaN, 'en-US')).toBe('0');
    expect(formatCount(0, 'en-US')).toBe('0');
  });
});

describe('formatCost', () => {
  it('prices an amount of one or more in two decimals', () => {
    expect(formatCost(12.5, 'USD', 'en-US')).toBe('$12.50');
    expect(formatCost(1, 'USD', 'en-US')).toBe('$1.00');
  });

  it('keeps the significant digits of a fraction of a cent instead of rounding it to zero', () => {
    expect(formatCost(0.000123, 'USD', 'en-US')).toBe('$0.000123');
    expect(formatCost(0.0042, 'USD', 'en-US')).toBe('$0.0042');
  });

  it('shows zero as an ordinary amount', () => {
    expect(formatCost(0, 'USD', 'en-US')).toBe('$0.00');
  });

  it('formats negative fractions with their digits too', () => {
    expect(formatCost(-0.5, 'USD', 'en-US')).toBe('-$0.5');
  });

  it('uses the currency it is given', () => {
    expect(formatCost(250, 'INR', 'en-IN')).toBe('₹250.00');
  });

  it('still reads as a number with the code beside it when the currency code is not one', () => {
    expect(formatCost(3.5, 'not-a-code', 'en-US')).toBe('3.5 not-a-code');
  });
});

describe('prettyJson', () => {
  it('indents a JSON document for reading', () => {
    expect(prettyJson('{"title":"Sunday Pottery","spots":8}')).toBe('{\n  "title": "Sunday Pottery",\n  "spots": 8\n}');
  });

  it('shows text that is not JSON exactly as it came', () => {
    expect(prettyJson('{"cut": "after 2000 chars…')).toBe('{"cut": "after 2000 chars…');
  });

  it('reads nothing as an empty string', () => {
    expect(prettyJson(null)).toBe('');
    expect(prettyJson(undefined)).toBe('');
    expect(prettyJson('')).toBe('');
  });
});
