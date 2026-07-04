import { describe, expect, it } from 'vitest';
import {
  checkoutSchema,
  checkoutDefaults,
  toCheckoutContact,
  toCheckoutBilling,
} from './checkout.types';
import type { CheckoutForm } from '../queries';

const valid: CheckoutForm = {
  full_name: 'Jane Doe',
  email: ' jane@example.com ',
  phone_extension: '+91',
  phone_number: '9876543210',
  same_as_main: false,
  line1: '221B Baker Street',
  line2: 'Flat 4',
  landmark: 'Near the museum',
  city: 'London',
  state: 'Greater London',
  pincode: '110001',
  country: 'India',
  billing_email: '',
  gstin: '',
  save_as_main: false,
  simulate_failure: false,
};

const mainAddress = {
  line1: '5 Residency Road',
  line2: '',
  landmark: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560025',
  country: 'India',
};

const firstError = (result: ReturnType<typeof checkoutSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('checkoutSchema', () => {
  it('exposes +91 / India / false defaults', () => {
    expect(checkoutDefaults.phone_extension).toBe('+91');
    expect(checkoutDefaults.country).toBe('India');
    expect(checkoutDefaults.same_as_main).toBe(false);
    expect(checkoutDefaults.simulate_failure).toBe(false);
  });

  it('accepts a fully valid payload with an entered address', () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty phone field with a digits message', () => {
    const result = checkoutSchema.safeParse({ ...valid, phone_number: '' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/phone/i);
  });

  it('rejects a phone with alphabetic characters', () => {
    expect(firstError(checkoutSchema.safeParse({ ...valid, phone_number: '98abcde' }))).toMatch(/digits/i);
  });

  it('rejects an invalid email', () => {
    expect(firstError(checkoutSchema.safeParse({ ...valid, email: 'not-an-email' }))).toMatch(/email/i);
  });

  it('requires line1/city/state/pincode when NOT same as main', () => {
    expect(firstError(checkoutSchema.safeParse({ ...valid, line1: 'ab' }))).toMatch(/address line 1/i);
    expect(firstError(checkoutSchema.safeParse({ ...valid, city: '' }))).toMatch(/city/i);
    expect(firstError(checkoutSchema.safeParse({ ...valid, state: '' }))).toMatch(/state/i);
    expect(firstError(checkoutSchema.safeParse({ ...valid, pincode: '12' }))).toMatch(/pincode/i);
  });

  it('skips the address requirement when same as main is checked', () => {
    const result = checkoutSchema.safeParse({
      ...valid,
      same_as_main: true,
      line1: '',
      city: '',
      state: '',
      pincode: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid GSTIN and rejects a malformed one', () => {
    expect(checkoutSchema.safeParse({ ...valid, gstin: '27AAPFU0939F1Z' }).success).toBe(true);
    // lower-case is accepted (validated uppercased, mirroring the server).
    expect(checkoutSchema.safeParse({ ...valid, gstin: '27aapfu0939f1z' }).success).toBe(true);
    expect(firstError(checkoutSchema.safeParse({ ...valid, gstin: 'NOTAGSTIN' }))).toMatch(/gstin/i);
  });

  it('accepts an empty billing email but rejects a malformed one', () => {
    expect(checkoutSchema.safeParse({ ...valid, billing_email: '' }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...valid, billing_email: 'billing@acme.io' }).success).toBe(true);
    expect(firstError(checkoutSchema.safeParse({ ...valid, billing_email: 'nope' }))).toMatch(/billing email/i);
  });
});

describe('toCheckoutContact', () => {
  it('normalises the contact block (lowercased email, trimmed name)', () => {
    const parsed = checkoutSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const payload = toCheckoutContact(parsed.data);
    expect(payload.contact_name).toBe('Jane Doe');
    expect(payload.contact_email).toBe('jane@example.com');
    expect(payload.contact_phone_extension).toBe('+91');
    expect(payload.contact_phone_number).toBe('9876543210');
    expect(payload.simulate_failure).toBe(false);
    expect('billing_address' in payload).toBe(false);
  });
});

describe('toCheckoutBilling', () => {
  it('uses the entered fields and omits empty gstin/email', () => {
    const billing = toCheckoutBilling(valid, mainAddress);
    expect(billing.line1).toBe('221B Baker Street');
    expect(billing.city).toBe('London');
    expect(billing.state).toBe('Greater London');
    expect(billing.pincode).toBe('110001');
    expect(billing.country).toBe('India');
    expect('gstin' in billing).toBe(false);
    expect('email' in billing).toBe(false);
  });

  it('uppercases the GSTIN and only sends a differing billing email', () => {
    const billing = toCheckoutBilling(
      { ...valid, gstin: '27aapfu0939f1z', billing_email: 'Billing@Acme.IO' },
      mainAddress,
    );
    expect(billing.gstin).toBe('27AAPFU0939F1Z');
    expect(billing.email).toBe('billing@acme.io');
  });

  it('drops a billing email equal to the contact email', () => {
    const billing = toCheckoutBilling({ ...valid, billing_email: ' Jane@Example.com ' }, mainAddress);
    expect('email' in billing).toBe(false);
  });

  it('resolves to the main address when same as main is checked', () => {
    const billing = toCheckoutBilling({ ...valid, same_as_main: true, line1: '', city: '' }, mainAddress);
    expect(billing.line1).toBe('5 Residency Road');
    expect(billing.city).toBe('Bengaluru');
    expect(billing.pincode).toBe('560025');
  });

  it('falls back to India when country is blank', () => {
    const billing = toCheckoutBilling({ ...valid, country: '' }, mainAddress);
    expect(billing.country).toBe('India');
  });
});
