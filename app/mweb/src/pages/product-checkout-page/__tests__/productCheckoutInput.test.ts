import { describe, expect, it } from 'vitest';
import type { CartLine } from '../../../components/cart/CartContext';
import type { CheckoutForm } from '../../checkout-page/queries';
import { buildProductCheckoutInput, mapLinesToItems, productSubtotal } from '../productCheckoutInput';

const line = (over: Partial<CartLine> = {}): CartLine => ({
  pod_id: 'pod1',
  pod_title: 'Sunset Jam',
  club_slug: 'club-one',
  product_id: 'a',
  variant_id: '',
  variant_label: '',
  product_name: 'Alpha Tee',
  image_url: 'http://x/a.jpg',
  unit_cost: 100,
  quantity: 2,
  max_quantity: 5,
  ...over,
});

const form: CheckoutForm = {
  full_name: 'Jane Doe',
  email: 'JANE@Example.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  same_as_main: false,
  line1: '221B Baker Street',
  line2: 'Flat 2',
  landmark: 'Near Park',
  city: 'London',
  state: 'LDN',
  pincode: '123456',
  country: 'India',
  billing_email: '',
  has_gstin: false,
  gstin: '',
  save_as_main: false,
  simulate_failure: true,
};

describe('productCheckoutInput helpers', () => {
  it('maps cart lines to product cart items, keeping pod + variant', () => {
    const items = mapLinesToItems([line(), line({ variant_id: 'v1', quantity: 1 })]);
    expect(items).toEqual([
      { product_id: 'a', pod_id: 'pod1', quantity: 2 },
      { product_id: 'a', pod_id: 'pod1', quantity: 1, variant_id: 'v1' },
    ]);
  });

  it('sums the products subtotal from variant-aware unit costs', () => {
    expect(productSubtotal([line({ quantity: 2, unit_cost: 100 }), line({ quantity: 1, unit_cost: 120 })])).toBe(320);
  });

  it('builds the ProductCheckoutInput with items, contact, shipping and coupon', () => {
    const items = mapLinesToItems([line()]);
    const { input, simulate_failure } = buildProductCheckoutInput(form, {
      items,
      podTitle: 'Sunset Jam',
      mainAddress: null,
      couponCode: 'SAVE10',
    });
    expect(simulate_failure).toBe(true);
    expect(input.items).toEqual(items);
    expect(input.description).toBe('Product order · Sunset Jam');
    // Contact email is lowercased by toCheckoutContact.
    expect(input.contact_email).toBe('jane@example.com');
    expect(input.contact_phone_extension).toBe('+91');
    expect(input.shipping_address).toMatchObject({
      name: 'Jane Doe',
      phone: '+91 9876543210',
      line1: '221B Baker Street',
      city: 'London',
      pincode: '123456',
      country: 'India',
    });
    expect(input.delivery_pincode).toBe('123456');
    expect(input.coupon_code).toBe('SAVE10');
    expect(typeof input.checkout_url).toBe('string');
    // Never leaks a simulate_failure into the shared input payload.
    expect('simulate_failure' in input).toBe(false);
  });

  it('passes a null coupon through unchanged', () => {
    const { input } = buildProductCheckoutInput(form, {
      items: mapLinesToItems([line()]),
      podTitle: 'Sunset Jam',
      mainAddress: null,
      couponCode: null,
    });
    expect(input.coupon_code).toBeNull();
  });
});
