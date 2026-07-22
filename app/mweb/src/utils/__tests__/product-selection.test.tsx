import { describe, it, expect } from 'vitest';
import {
  selectionKey,
  parseSelectionKey,
} from '../product-selection';

describe('selectionKey', () => {
  it('returns bare productId when no variantId is provided', () => {
    expect(selectionKey('prod1')).toBe('prod1');
  });

  it('returns bare productId when variantId is null', () => {
    expect(selectionKey('prod1', null)).toBe('prod1');
  });

  it('returns bare productId when variantId is undefined', () => {
    expect(selectionKey('prod1', undefined)).toBe('prod1');
  });

  it('returns bare productId when variantId is empty string (falsy)', () => {
    expect(selectionKey('prod1', '')).toBe('prod1');
  });

  it('joins productId and variantId with the :: separator', () => {
    expect(selectionKey('prod1', 'var2')).toBe('prod1::var2');
  });
});

describe('parseSelectionKey', () => {
  it('parses a bare product key with empty variant_id', () => {
    expect(parseSelectionKey('prod1')).toEqual({
      product_id: 'prod1',
      variant_id: '',
    });
  });

  it('parses a composite key into product_id and variant_id', () => {
    expect(parseSelectionKey('prod1::var2')).toEqual({
      product_id: 'prod1',
      variant_id: 'var2',
    });
  });

  it('splits only on the first :: separator', () => {
    expect(parseSelectionKey('prod1::var2::extra')).toEqual({
      product_id: 'prod1',
      variant_id: 'var2::extra',
    });
  });

  it('round-trips with selectionKey', () => {
    const key = selectionKey('abc', 'xyz');
    expect(parseSelectionKey(key)).toEqual({
      product_id: 'abc',
      variant_id: 'xyz',
    });
  });

  it('handles empty variant_id after separator', () => {
    expect(parseSelectionKey('prod1::')).toEqual({
      product_id: 'prod1',
      variant_id: '',
    });
  });
});
