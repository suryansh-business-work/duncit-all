import { describe, expect, it } from 'vitest';
import { checkoutSchema, checkoutDefaults, toCheckoutContact } from './checkout.types';

const valid = {
  email: ' jane@example.com ',
  phone_extension: '+91',
  phone_number: '9876543210',
  billing_address: '221B Baker Street, London NW1',
  simulate_failure: false,
} as const;

const firstError = (result: ReturnType<typeof checkoutSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('checkoutSchema', () => {
  it('exposes +91 / false defaults', () => {
    expect(checkoutDefaults.phone_extension).toBe('+91');
    expect(checkoutDefaults.simulate_failure).toBe(false);
  });

  it('rejects an empty phone field with a digits message', () => {
    const result = checkoutSchema.safeParse({ ...valid, phone_number: '' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/phone/i);
  });

  it('rejects a phone with alphabetic characters', () => {
    const result = checkoutSchema.safeParse({ ...valid, phone_number: '98abcde' });
    expect(firstError(result)).toMatch(/digits/i);
  });

  it('rejects an invalid email', () => {
    expect(firstError(checkoutSchema.safeParse({ ...valid, email: 'not-an-email' }))).toMatch(
      /email/i,
    );
  });

  it('rejects a billing address shorter than 8 characters', () => {
    expect(firstError(checkoutSchema.safeParse({ ...valid, billing_address: 'short' }))).toMatch(
      /8 characters/i,
    );
  });

  it('accepts a fully valid payload and normalises through toCheckoutContact', () => {
    const parsed = checkoutSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.email).toBe('jane@example.com');
    const payload = toCheckoutContact(parsed.data);
    expect(payload.contact_email).toBe('jane@example.com');
    expect(payload.contact_phone_extension).toBe('+91');
    expect(payload.contact_phone_number).toBe('9876543210');
    expect(payload.billing_address).toBe('221B Baker Street, London NW1');
    expect(payload.simulate_failure).toBe(false);
  });
});
