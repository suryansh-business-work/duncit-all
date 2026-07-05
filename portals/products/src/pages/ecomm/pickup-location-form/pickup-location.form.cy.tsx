import { describe, expect, it } from 'vitest';
import { pickupLocationSchema } from './pickup-location.form';
import { pickupLocationInitialValues, toSubmitInput } from './pickup-location.types';

const valid = {
  ...pickupLocationInitialValues,
  nickname: 'Main warehouse',
  contact_name: 'Asha Rao',
  phone: '9876543210',
  email: 'ops@brand.com',
  address_line1: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
};

const messages = (result: ReturnType<typeof pickupLocationSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('pickupLocationSchema', () => {
  it('accepts a fully valid pickup location', () => {
    expect(pickupLocationSchema.parse(valid)).toMatchObject({ nickname: 'Main warehouse' });
  });

  it('requires a nickname of at least 3 characters', () => {
    const result = pickupLocationSchema.safeParse({ ...valid, nickname: 'ab' });
    expect(messages(result)).toMatch(/at least 3/i);
  });

  it('rejects a non 10-digit phone', () => {
    const result = pickupLocationSchema.safeParse({ ...valid, phone: '12345' });
    expect(messages(result)).toMatch(/10-digit/i);
  });

  it('rejects a non 6-digit pincode', () => {
    const result = pickupLocationSchema.safeParse({ ...valid, pincode: '12' });
    expect(messages(result)).toMatch(/6-digit/i);
  });

  it('rejects an invalid email', () => {
    const result = pickupLocationSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(messages(result)).toMatch(/valid email/i);
  });

  it('normalises the email to lowercase', () => {
    const parsed = pickupLocationSchema.parse({ ...valid, email: 'OPS@Brand.com' });
    expect(parsed.email).toBe('ops@brand.com');
  });

  it('builds a submit input carrying owner kind and brand id', () => {
    const input = toSubmitInput(valid, { owner_kind: 'BRAND', brand_id: 'brand-1' });
    expect(input).toMatchObject({ owner_kind: 'BRAND', brand_id: 'brand-1', pincode: '560001' });
  });
});
