/**
 * The two leaf modules: money formatting (one formatter so the card, the rail
 * and the attached list cannot disagree about a price) and the layered
 * translator (provider copy wins, the local bundle answers what the provider
 * never mounted, a key nobody ships stays visible rather than blank).
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatMoney } from '../src/format';
import { POD_PRODUCT_FALLBACK_FLAT, useTranslation } from '../src/i18n/useTranslation';

describe('formatMoney', () => {
  it('formats an INR amount', () => {
    const text = formatMoney(450);
    expect(text).toContain('450');
    expect(text).toContain('₹');
  });

  it('treats a non-numeric amount as zero rather than rendering NaN', () => {
    expect(formatMoney(Number.NaN)).toBe(formatMoney(0));
    expect(formatMoney(Number.NaN)).not.toContain('NaN');
  });
});

describe('useTranslation', () => {
  it('ships the picker namespace in its local fallback bundle', () => {
    expect(POD_PRODUCT_FALLBACK_FLAT['podProduct.dialogTitle']).toBe('Add a product');
  });

  it('resolves the picker keys and reports them through has()', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.has('podProduct.close')).toBe(true);
    expect(result.current.t('podProduct.dialogTitle')).toBe('Add a product');
    expect(result.current.t('podProduct.maxQtyHint', { vars: { count: 3 } })).toBe(
      'Only 3 available.'
    );
  });

  it('a key nobody ships resolves to itself, visibly, and has() says so', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.has('podProduct.neverShippedKey')).toBe(false);
    expect(result.current.t('podProduct.neverShippedKey')).toBe('podProduct.neverShippedKey');
  });
});
