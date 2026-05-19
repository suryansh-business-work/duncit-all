import { describe, expect, it } from 'vitest';
import { productListingSchema } from './list-products.form';

const validListing = {
  is_duncit_delivery_partner: true,
  product_name: 'Cold brew kit',
  image_urls: ['https://cdn.example.com/product.jpg'],
  description: 'A complete cold brew kit for hosts to add to their pods.',
  size_label: 'Medium box',
  height_cm: 24,
  weight_kg: 1.2,
  color: 'Black',
  inventory_count: 12,
  unit_cost: 499,
  commission_pct: 15,
  delivery_target: 'HOST',
};

describe('productListingSchema', () => {
  it('rejects missing required product details', async () => {
    const error = await productListingSchema
      .validate({ ...validListing, product_name: '', image_urls: [] }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/product title/i);
    expect(error.errors.join(' ')).toMatch(/image/i);
  });

  it('requires commission in allowed range', async () => {
    const error = await productListingSchema
      .validate({ ...validListing, commission_pct: 3 }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/commission/i);
  });

  it('accepts a complete product listing', async () => {
    await productListingSchema.validate(validListing, { abortEarly: false });
  });
});