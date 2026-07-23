import {
  buildProductCheckoutInput,
  mapLinesToItems,
  productOrderDescription,
  productSubtotal,
} from '@/utils/product-checkout-input';
import type { CartLine } from '@/stores/cart.store';
import type { CheckoutFormValues } from '@/forms/checkout';

// checkoutRequests (pulled in transitively via useCheckout) touches these native
// modules at import — stub them so the pure builder can be imported in isolation.
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const line = (over: Partial<CartLine> = {}): CartLine => ({
  pod_id: 'p1',
  pod_title: 'Sunset Jam',
  club_slug: 'club-one',
  product_id: 'a',
  variant_id: '',
  variant_label: '',
  product_name: 'Alpha Tee',
  image_url: '',
  unit_cost: 100,
  quantity: 2,
  max_quantity: 5,
  ...over,
});

const values: CheckoutFormValues = {
  full_name: '  Riya Sharma  ',
  email: 'r@d.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  same_as_main: false,
  line1: '12 Main Street',
  line2: 'Apt 4',
  landmark: 'Near Park',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  country: 'India',
  billing_email: '',
  has_gstin: false,
  gstin: '',
  save_as_main: false,
  simulate_failure: false,
};

describe('mapLinesToItems', () => {
  it('maps base + variant lines, keeping the pod and dropping empty variant ids', () => {
    expect(
      mapLinesToItems([line(), line({ variant_id: 'v1', product_id: 'b', quantity: 1 })]),
    ).toEqual([
      { product_id: 'a', pod_id: 'p1', quantity: 2 },
      { product_id: 'b', pod_id: 'p1', quantity: 1, variant_id: 'v1' },
    ]);
  });
});

describe('productSubtotal', () => {
  it('sums variant-aware unit cost × quantity', () => {
    expect(productSubtotal([line(), line({ unit_cost: 50, quantity: 3 })])).toBe(350);
  });
});

describe('productOrderDescription', () => {
  it('counts total units with singular/plural wording', () => {
    expect(productOrderDescription(mapLinesToItems([line({ quantity: 1 })]))).toBe(
      'Product order · 1 item',
    );
    expect(productOrderDescription(mapLinesToItems([line(), line({ product_id: 'b' })]))).toBe(
      'Product order · 4 items',
    );
  });
});

describe('buildProductCheckoutInput', () => {
  const items = mapLinesToItems([line()]);

  it('builds the product input from the entered fields (no coupon, no simulate)', () => {
    const { input, simulate_failure } = buildProductCheckoutInput(values, {
      items,
      mainAddress: null,
      couponCode: null,
    });
    expect(simulate_failure).toBe(false);
    expect(input).toMatchObject({
      items,
      description: 'Product order · 2 items',
      contact_name: 'Riya Sharma',
      contact_email: 'r@d.com',
      contact_phone_extension: '+91',
      contact_phone_number: '9876543210',
      delivery_pincode: '411001',
      checkout_url: 'duncit-mobile://product-checkout',
      coupon_code: null,
    });
    // Shipping delivers to the entered billing fields + contact.
    expect(input.shipping_address).toMatchObject({
      name: 'Riya Sharma',
      phone: '+91 9876543210',
      email: 'r@d.com',
      line1: '12 Main Street',
      city: 'Pune',
      pincode: '411001',
      country: 'India',
    });
    expect(input.billing).toMatchObject({ line1: '12 Main Street', city: 'Pune' });
  });

  it('bills to the saved main address when same-as-main, ships to the entered fields', () => {
    const mainAddress = {
      line1: 'Main St 1',
      line2: '',
      landmark: '',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      country: 'India',
    };
    const { input } = buildProductCheckoutInput(
      { ...values, same_as_main: true },
      { items, mainAddress, couponCode: 'TEN' },
    );
    expect(input.billing).toMatchObject({ line1: 'Main St 1', city: 'Delhi' });
    expect(input.shipping_address).toMatchObject({ line1: '12 Main Street' });
    expect(input.coupon_code).toBe('TEN');
  });

  it('defaults every empty address field and the country, and carries simulate_failure', () => {
    const blank = undefined as unknown as string;
    const { input, simulate_failure } = buildProductCheckoutInput(
      {
        ...values,
        country: '',
        line1: blank,
        line2: blank,
        landmark: blank,
        city: blank,
        state: blank,
        pincode: blank,
        simulate_failure: true,
      },
      { items, couponCode: null },
    );
    expect(simulate_failure).toBe(true);
    expect(input.shipping_address).toMatchObject({
      line1: '',
      line2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    });
  });
});
