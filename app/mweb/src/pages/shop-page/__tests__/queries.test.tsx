import { describe, it, expect } from 'vitest';
import {
  SHOP_PRODUCTS,
  SHOP_SORT_OPTIONS,
  sortShopProducts,
  type ShopProduct,
} from '../queries';

function makeProduct(overrides: Partial<ShopProduct> = {}): ShopProduct {
  return {
    id: 'p1',
    product_name: 'Zeta',
    brand_name: null,
    image_url: null,
    images: [],
    unit_cost: 100,
    category_id: null,
    super_category_id: null,
    sub_category_id: null,
    created_at: null,
    ...overrides,
  };
}

describe('shop-page queries module', () => {
  it('exposes the ShopProducts document with the expected operation', () => {
    const op = SHOP_PRODUCTS.definitions[0];
    expect(op.kind).toBe('OperationDefinition');
    const printed = JSON.stringify(SHOP_PRODUCTS);
    expect(printed).toContain('availablePodProducts');
    expect(printed).toContain('ShopProducts');
    expect(printed).toContain('unit_cost');
  });

  it('provides three sort options with stable values', () => {
    expect(SHOP_SORT_OPTIONS).toHaveLength(3);
    expect(SHOP_SORT_OPTIONS.map((o) => o.value)).toEqual([
      'NAME',
      'PRICE_ASC',
      'PRICE_DESC',
    ]);
    SHOP_SORT_OPTIONS.forEach((o) => expect(typeof o.label).toBe('string'));
  });

  it('sorts by name A-Z by default (NAME)', () => {
    const products = [
      makeProduct({ id: 'a', product_name: 'Banana' }),
      makeProduct({ id: 'b', product_name: 'Apple' }),
      makeProduct({ id: 'c', product_name: 'Cherry' }),
    ];
    const sorted = sortShopProducts(products, 'NAME');
    expect(sorted.map((p) => p.product_name)).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('sorts by price ascending (PRICE_ASC)', () => {
    const products = [
      makeProduct({ id: 'a', unit_cost: 300 }),
      makeProduct({ id: 'b', unit_cost: 100 }),
      makeProduct({ id: 'c', unit_cost: 200 }),
    ];
    const sorted = sortShopProducts(products, 'PRICE_ASC');
    expect(sorted.map((p) => p.unit_cost)).toEqual([100, 200, 300]);
  });

  it('sorts by price descending (PRICE_DESC)', () => {
    const products = [
      makeProduct({ id: 'a', unit_cost: 100 }),
      makeProduct({ id: 'b', unit_cost: 300 }),
      makeProduct({ id: 'c', unit_cost: 200 }),
    ];
    const sorted = sortShopProducts(products, 'PRICE_DESC');
    expect(sorted.map((p) => p.unit_cost)).toEqual([300, 200, 100]);
  });

  it('does not mutate the input array', () => {
    const products = [
      makeProduct({ id: 'a', unit_cost: 300 }),
      makeProduct({ id: 'b', unit_cost: 100 }),
    ];
    const original = products.map((p) => p.unit_cost);
    sortShopProducts(products, 'PRICE_ASC');
    expect(products.map((p) => p.unit_cost)).toEqual(original);
  });

  it('handles an empty product list', () => {
    expect(sortShopProducts([], 'NAME')).toEqual([]);
  });
});
