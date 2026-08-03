import { describe, expect, it } from 'vitest';
import {
  productEditPath,
  productListLabel,
  productListPath,
} from '../../src/pages/inventory-page/inventory-product-page/productPaths';

describe('product editor route helpers', () => {
  it('points at the Duncit catalogue when there is no brand', () => {
    expect(productListPath()).toBe('/inventory');
    expect(productEditPath('p1')).toBe('/inventory/p1/edit');
    expect(productListLabel()).toBe('Inventory');
  });

  it('points at the brand catalogue when a brand id is given', () => {
    expect(productListPath('b1')).toBe('/catalog/brands/b1/products');
    expect(productEditPath('p1', 'b1')).toBe('/catalog/brands/b1/products/p1/edit');
    expect(productListLabel('b1')).toBe('Brand products');
  });
});
