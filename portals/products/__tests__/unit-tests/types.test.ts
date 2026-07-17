import { describe, expect, it } from 'vitest';
import {
  blankProductForm,
  toFormValues,
  toSubmitInput,
} from '../../src/pages/inventory-page/inventory-product-page/types';

describe('inventory product form mappers', () => {
  it('returns the blank form when there is no product', () => {
    expect(toFormValues(null)).toEqual(blankProductForm);
    expect(toFormValues(undefined)).toBe(blankProductForm);
  });

  it('maps a loaded product into form values, slicing dates to yyyy-MM-dd', () => {
    const values = toFormValues({
      id: 'p1',
      product_name: 'Cold Brew',
      sku: 'cb-1',
      images: ['a.jpg'],
      tags: ['coffee'],
      expiry_date: '2026-05-20T10:00:00.000Z',
      manufacturing_date: null,
      inventory_count: 9,
      product_type: 'MERCHANDISE',
      unit_type: 'BOTTLE',
      status: 'DRAFT',
      visibility: 'INTERNAL',
      delivery_available: true,
    });
    expect(values.id).toBe('p1');
    expect(values.product_name).toBe('Cold Brew');
    expect(values.expiry_date).toBe('2026-05-20');
    expect(values.manufacturing_date).toBe('');
    expect(values.images).toEqual(['a.jpg']);
    expect(values.tags).toEqual(['coffee']);
    expect(values.inventory_count).toBe(9);
    expect(values.product_type).toBe('MERCHANDISE');
  });

  it('applies defaults for missing fields and non-array images/tags', () => {
    // An object with no product_name exercises the `?? ''` string fallbacks.
    const values = toFormValues({ images: 'not-array', tags: null });
    expect(values.product_name).toBe('');
    expect(values.images).toEqual([]);
    expect(values.tags).toEqual([]);
    expect(values.min_order_qty).toBe(1);
    expect(values.max_order_qty).toBe(100);
    expect(values.low_stock_alert).toBe(5);
    expect(values.product_type).toBe('CONSUMABLE');
    expect(values.status).toBe('ACTIVE');
    expect(values.pod_available).toBe(true);
    expect(values.delivery_available).toBe(false);
  });

  it('builds the submit input: strips id, upper-cases SKU, nulls empties, filters images', () => {
    const input = toSubmitInput({
      ...blankProductForm,
      id: 'p9',
      sku: '  cb-2 ',
      category_id: '',
      expiry_date: '',
      manufacturing_date: '2026-01-01',
      images: ['a.jpg', '', 'b.jpg'],
    });
    expect('id' in input).toBe(false);
    expect(input.sku).toBe('CB-2');
    expect(input.category_id).toBeNull();
    expect(input.expiry_date).toBeNull();
    expect(input.manufacturing_date).toBe('2026-01-01');
    expect(input.images).toEqual(['a.jpg', 'b.jpg']);
  });
});
