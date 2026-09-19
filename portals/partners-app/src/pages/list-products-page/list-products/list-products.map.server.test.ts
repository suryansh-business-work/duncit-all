import { describe, expect, it } from 'vitest';
import { productToValues } from './list-products.map';

/** Records shaped exactly as myProductListings returns them. */
describe('productToValues — server records', () => {
  it('gives a variant saved without a colour the default swatch', () => {
    const form = productToValues({
      product_name: 'Alpha Tee',
      variants: [
        {
          option_label: 'M',
          option_values: [{ name: 'Size', value: 'M' }],
          color: '',
          size_label: 'M',
          description: 'Soft cotton tee for weekend pods.',
          unit_cost: 499,
          inventory_count: 12,
          images: ['https://cdn.test/alpha.jpg'],
          height_cm: 2,
          breadth_cm: 25,
          length_cm: 30,
          weight_kg: 0.3,
        },
      ],
    });

    expect(form.variants[0]).toMatchObject({
      option_label: 'M',
      option_values: [{ name: 'Size', value: 'M' }],
      color: '#000000',
      size_label: 'M',
      image_urls: ['https://cdn.test/alpha.jpg'],
    });
  });

  it('reads a category row whose ids were never resolved as blank ids, keeping its names', () => {
    const form = productToValues({
      product_name: 'Alpha Tee',
      categories: [
        {
          super_category_id: null,
          category_id: null,
          sub_category_id: null,
          super_category_name: 'Apparel',
          category_name: 'Tops',
          sub_category_name: 'T-shirts',
        },
      ],
    });

    expect(form.categories).toEqual([
      { super_id: '', super_name: 'Apparel', category_id: '', category_name: 'Tops', sub_id: '', sub_name: 'T-shirts' },
    ]);
  });
});
