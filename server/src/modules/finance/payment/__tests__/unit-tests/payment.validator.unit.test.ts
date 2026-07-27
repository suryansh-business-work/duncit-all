import {
  dummyCheckoutSchema,
  dummyProductCheckoutSchema,
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

describe('checkout validators — only the email is mandatory', () => {
  it('accepts a pod checkout with no phone and no billing address', async () => {
    const parsed = await dummyCheckoutSchema.validate(
      podInput({
        contact_phone_extension: '',
        contact_phone_number: '',
        billing: undefined,
      }),
    );
    expect(parsed.contact_email).toBe('riya@duncit.com');
  });

  it('accepts a pod checkout whose billing address parts are all blank', async () => {
    const parsed = await dummyCheckoutSchema.validate(
      podInput({ billing: { line1: '', city: '', state: '', pincode: '' } }),
    );
    expect(parsed.billing?.line1).toBe('');
  });

  it('still rejects a pod checkout without an email', async () => {
    await expect(dummyCheckoutSchema.validate(podInput({ contact_email: '' }))).rejects.toThrow(
      /email/i,
    );
  });

  it('still rejects a malformed phone when one is sent', async () => {
    await expect(
      dummyCheckoutSchema.validate(podInput({ contact_phone_number: '98abcde' })),
    ).rejects.toThrow(/digits/i);
  });

  it('accepts a product checkout with no phone', async () => {
    const parsed = await dummyProductCheckoutSchema.validate(
      productInput({ contact_phone_extension: '', contact_phone_number: '' }),
    );
    expect(parsed.billing?.city).toBe('Pune');
  });

  it('still requires a delivery address on the product checkout', async () => {
    await expect(
      dummyProductCheckoutSchema.validate(productInput({ billing: undefined })),
    ).rejects.toThrow(/billing address/i);
    await expect(
      dummyProductCheckoutSchema.validate(
        productInput({ billing: { line1: '12 Main Street', city: '', state: 'MH', pincode: '411001' } }),
      ),
    ).rejects.toThrow(/city/i);
  });
});
