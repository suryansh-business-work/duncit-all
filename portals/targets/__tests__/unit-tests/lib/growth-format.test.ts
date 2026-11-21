import { describe, expect, it } from 'vitest';
import { formatInput, formatRupees, formatRupeesShort, formatTarget } from '../../../src/lib/growth-format';

describe('growth formatting', () => {
  it('shows rupees with lakh/crore grouping, and paise only when there are any', () => {
    expect(formatRupees('16000000.00')).toBe('₹1,60,00,000');
    expect(formatRupees('320000.00')).toBe('₹3,20,000');
    expect(formatRupees('0.50')).toBe('₹0.50');
    expect(formatRupees('2799.93')).toBe('₹2,799.93');
  });

  it('shortens to lakhs and crores from one lakh up, and leaves smaller amounts whole', () => {
    expect(formatRupeesShort('16000000.00')).toMatch(/^₹1\.6\s?Cr$/);
    expect(formatRupeesShort('320000.00')).toMatch(/^₹3\.2\s?L$/);
    expect(formatRupeesShort('99999.00')).toBe('₹99,999');
  });

  it('groups whole-number targets and assumptions the Indian way', () => {
    expect(formatTarget(40000)).toBe('40,000');
    expect(formatTarget(10_000_000)).toBe('1,00,00,000');
    expect(formatInput(0.01)).toBe('0.01');
    expect(formatInput(100000)).toBe('1,00,000');
  });
});
