import {
  dummyCheckoutSchema,
  dummyProductCheckoutSchema,
  productCheckoutSchema,
  razorpayOrderSchema,
} from '../../payment.validator';

const podInput = (over: Record<string, any> = {}) => ({
  pod_id: 'pod1',
  amount: 500,
  description: 'Pod booking',
  contact_name: 'Riya Sharma',
  contact_email: 'riya@duncit.com',
  contact_phone_extension: '+91',
  contact_phone_number: '9876543210',
  billing: { line1: '12 Main Street', city: 'Pune', state: 'MH', pincode: '411001' },
  checkout_url: 'https://mweb.duncit.com/checkout/pod1',
  ...over,
});

const productInput = (over: Record<string, any> = {}) => ({
  items: [{ product_id: 'p1', pod_id: 'pod1', quantity: 1 }],
  description: 'Product order',
  contact_email: 'riya@duncit.com',
  contact_phone_extension: '+91',
  contact_phone_number: '9876543210',
  billing: { line1: '12 Main Street', city: 'Pune', state: 'MH', pincode: '411001' },
  checkout_url: 'https://mweb.duncit.com/product-checkout',
  ...over,
});

// The phone stayed optional, but the billing address did not: "Fix checkout
// booking conflicts and billing validation" (25c8d6dfb) made every payment
// carry a real invoice address, on the pod flow as well as the product one, and
// updated both checkout forms to collect it. These cases used to assert the
// intermediate rule where only the email was mandatory.
describe('checkout validators — an email and a billing address are mandatory', () => {
  it('accepts a pod checkout with no phone', async () => {
    const parsed = await dummyCheckoutSchema.parseAsync(
      podInput({ contact_phone_extension: '', contact_phone_number: '' }),
    );
    expect(parsed.contact_email).toBe('riya@duncit.com');
  });

  it('rejects a pod checkout with no billing address, and one left blank', async () => {
    await expect(dummyCheckoutSchema.parseAsync(podInput({ billing: undefined }))).rejects.toThrow(
      /billing address/i,
    );
    await expect(
      dummyCheckoutSchema.parseAsync(
        podInput({ billing: { line1: '', city: '', state: '', pincode: '' } }),
      ),
    ).rejects.toThrow(/billing address/i);
  });

  it('accepts the legacy one-line billing address older clients still send', async () => {
    const parsed = await dummyCheckoutSchema.parseAsync(
      podInput({ billing: undefined, billing_address: '12 Main Street, Pune 411001' }),
    );
    expect(parsed.billing_address).toBe('12 Main Street, Pune 411001');
  });

  it('still rejects a pod checkout without an email', async () => {
    await expect(dummyCheckoutSchema.parseAsync(podInput({ contact_email: '' }))).rejects.toThrow(
      /email/i,
    );
  });

  it('still rejects a malformed phone when one is sent', async () => {
    await expect(
      dummyCheckoutSchema.parseAsync(podInput({ contact_phone_number: '98abcde' })),
    ).rejects.toThrow(/digits/i);
  });

  it('accepts a product checkout with no phone', async () => {
    const parsed = await dummyProductCheckoutSchema.parseAsync(
      productInput({ contact_phone_extension: '', contact_phone_number: '' }),
    );
    expect(parsed.billing?.city).toBe('Pune');
  });

  it('still requires a delivery address on the product checkout', async () => {
    await expect(
      dummyProductCheckoutSchema.parseAsync(productInput({ billing: undefined })),
    ).rejects.toThrow(/billing address/i);
    await expect(
      dummyProductCheckoutSchema.parseAsync(
        productInput({ billing: { line1: '12 Main Street', city: '', state: 'MH', pincode: '411001' } }),
      ),
    ).rejects.toThrow(/city/i);
  });
});

// The yup → zod port declared shipping_address as an EMPTY shape, which drops
// every key it does not name: the address reached the order as `{}`, and every
// pod-shop ShipRocket booking was refused for a blank ship-to.
describe('checkout validators — the delivery address survives validation', () => {
  const shipTo = {
    name: 'Riya Sharma',
    phone: '9876543210',
    email: null,
    line1: '  12 Main Street  ',
    line2: null,
    landmark: 'Near the park',
    city: 'Pune',
    state: 'MH',
    pincode: '411001',
    country: 'India',
  };

  it('keeps every field of a product checkout address, trimmed, with nulls for omitted lines', async () => {
    const parsed = await productCheckoutSchema.parseAsync(
      productInput({ fulfilment_method: 'SHIP', shipping_address: shipTo }),
    );
    expect(parsed.shipping_address).toEqual({ ...shipTo, line1: '12 Main Street' });
  });

  it('keeps the address on a pod checkout that ships add-on products', async () => {
    const parsed = await razorpayOrderSchema.parseAsync(podInput({ shipping_address: shipTo }));
    expect(parsed.shipping_address).toMatchObject({ line1: '12 Main Street', city: 'Pune', pincode: '411001' });
  });

  it('still defaults to null when no address is sent (pickup orders)', async () => {
    const parsed = await dummyProductCheckoutSchema.parseAsync(productInput());
    expect(parsed.shipping_address).toBeNull();
  });

  it('refuses an address line longer than the order model stores', async () => {
    await expect(
      productCheckoutSchema.parseAsync(productInput({ shipping_address: { ...shipTo, line1: 'x'.repeat(201) } })),
    ).rejects.toThrow();
  });
});
