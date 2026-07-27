import {
  checkoutDefaults,
  checkoutSchema,
  productCheckoutSchema,
  type CheckoutFormValues,
} from '@/forms/checkout/checkout.types';

const base: CheckoutFormValues = {
  ...checkoutDefaults,
  full_name: 'Riya Sharma',
  email: 'riya@duncit.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  same_as_main: false,
  line1: '12 Main Street',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  country: 'India',
};

const parse = (over: Partial<CheckoutFormValues>) => checkoutSchema.safeParse({ ...base, ...over });
const parseProduct = (over: Partial<CheckoutFormValues>) =>
  productCheckoutSchema.safeParse({ ...base, ...over });

describe('checkoutSchema — contact + billing', () => {
  it('accepts a fully valid billing address', () => {
    expect(parse({}).success).toBe(true);
  });

  it('accepts a missing name, phone and address — only the email is mandatory', () => {
    expect(
      parse({
        full_name: '',
        phone_extension: '',
        phone_number: '',
        line1: '',
        city: '',
        state: '',
        pincode: '',
      }).success,
    ).toBe(true);
  });

  it('requires a valid contact email, and a valid phone only when one is typed', () => {
    expect(parse({ email: 'nope' }).success).toBe(false);
    expect(parse({ email: '' }).success).toBe(false);
    expect(parse({ phone_number: '12' }).success).toBe(false);
    expect(parse({ phone_extension: 'abc' }).success).toBe(false);
  });

  it('accepts a valid pincode range', () => {
    expect(parse({ pincode: '1234' }).success).toBe(true);
    expect(parse({ pincode: '1234567890' }).success).toBe(true);
  });

  it('validates the optional billing email only when present', () => {
    expect(parse({ billing_email: '' }).success).toBe(true);
    expect(parse({ billing_email: 'billing@duncit.com' }).success).toBe(true);
    expect(parse({ billing_email: 'not-an-email' }).success).toBe(false);
  });

  it('validates the GSTIN only when the has_gstin toggle is on (case-insensitive)', () => {
    // Toggle off → the GSTIN field is never validated, even if malformed.
    expect(parse({ has_gstin: false, gstin: 'INVALID123' }).success).toBe(true);
    // Toggle on → an empty GSTIN is still fine (it just won't be sent).
    expect(parse({ has_gstin: true, gstin: '' }).success).toBe(true);
    expect(parse({ has_gstin: true, gstin: '27AAAAA0000A1Z' }).success).toBe(true);
    expect(parse({ has_gstin: true, gstin: '27aaaaa0000a1z' }).success).toBe(true);
    expect(parse({ has_gstin: true, gstin: 'INVALID123' }).success).toBe(false);
  });
});

describe('productCheckoutSchema — delivery address', () => {
  it('requires line1 / city / state / pincode when not same-as-main', () => {
    expect(parseProduct({ line1: 'ab' }).success).toBe(false);
    expect(parseProduct({ city: '' }).success).toBe(false);
    expect(parseProduct({ state: '' }).success).toBe(false);
    expect(parseProduct({ pincode: '12' }).success).toBe(false);
  });

  it('skips address validation when "same as main" is on', () => {
    expect(
      parseProduct({ same_as_main: true, line1: '', city: '', state: '', pincode: '' }).success,
    ).toBe(true);
  });

  it('still accepts a missing phone — the parcel contact comes from the address book', () => {
    expect(parseProduct({ phone_number: '' }).success).toBe(true);
  });

  it('keeps the optional-field rules of the pod schema', () => {
    expect(parseProduct({ billing_email: 'not-an-email' }).success).toBe(false);
    expect(parseProduct({ has_gstin: true, gstin: 'INVALID123' }).success).toBe(false);
  });
});
