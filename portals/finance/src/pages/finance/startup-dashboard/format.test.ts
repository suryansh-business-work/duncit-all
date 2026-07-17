import { describe, expect, it } from 'vitest';
import { formatMetricValue, labelizeKey } from './format';

describe('formatMetricValue', () => {
  it('formats currency, compacting large amounts', () => {
    expect(formatMetricValue(1500, 'currency')).toBe('₹1,500');
    expect(formatMetricValue(1500000, 'currency')).toBe('₹15L');
  });

  it('formats percent, months, minutes, rating and boolean', () => {
    expect(formatMetricValue(12.345, 'percent')).toBe('12.3%');
    expect(formatMetricValue(6.2, 'months')).toBe('6.2 mo');
    expect(formatMetricValue(45, 'minutes')).toBe('45 min');
    expect(formatMetricValue(4.5, 'rating')).toBe('4.5 ★');
    expect(formatMetricValue(1, 'boolean')).toBe('Yes');
    expect(formatMetricValue(0, 'boolean')).toBe('No');
  });

  it('formats plain numbers with grouping', () => {
    expect(formatMetricValue(12345, 'number')).toBe('12,345');
  });
});

describe('labelizeKey', () => {
  it('humanises snake_case keys', () => {
    expect(labelizeKey('cash_in_bank')).toBe('Cash In Bank');
    expect(labelizeKey('ad_spend')).toBe('Ad Spend');
  });

  it('handles empty segments from doubled underscores', () => {
    expect(labelizeKey('a__b')).toBe('A  B');
  });
});
