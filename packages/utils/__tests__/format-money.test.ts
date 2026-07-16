import { describe, expect, it } from 'vitest';
import { formatINR, formatMoney } from '../src/format-money';

describe('formatINR', () => {
  it('formats whole rupees with en-IN grouping and the ₹ symbol', () => {
    expect(formatINR(125000)).toBe('₹1,25,000');
  });

  it('treats NaN/undefined-ish values as zero', () => {
    expect(formatINR(Number.NaN)).toBe('₹0');
    expect(formatINR(0)).toBe('₹0');
  });
});

describe('formatMoney', () => {
  it('defaults to ₹ with 0 decimals and en-IN grouping', () => {
    expect(formatMoney(125000)).toBe('₹1,25,000');
    expect(formatMoney(1250.4)).toBe('₹1,250');
  });

  it('treats falsy/NaN values as zero', () => {
    expect(formatMoney(Number.NaN)).toBe('₹0');
  });

  it('reproduces the finance money(symbol, value) family: fixed decimals, no grouping', () => {
    expect(formatMoney(1250, { symbol: '$', decimals: 2, grouping: false })).toBe('$1250.00');
    expect(formatMoney(Number.NaN, { symbol: '₹', decimals: 2, grouping: false })).toBe('₹0.00');
  });

  it('supports grouped output with fixed decimals', () => {
    expect(formatMoney(1250.5, { decimals: 2 })).toBe('₹1,250.50');
  });

  it('uses compact notation only at or above 1 lakh', () => {
    expect(formatMoney(120000, { compact: true })).toBe('₹1.2L');
    expect(formatMoney(-120000, { compact: true })).toBe('₹-1.2L');
    expect(formatMoney(99999, { compact: true })).toBe('₹99,999');
  });

  it('honors a custom symbol', () => {
    expect(formatMoney(500, { symbol: 'AED ' })).toBe('AED 500');
  });
});
