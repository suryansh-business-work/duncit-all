import { describe, expect, it } from 'vitest';
import { loginSchema } from '@/forms/login/login.form';
import { loginInitialValues } from '@/forms/login/login.types';

const valid = { ...loginInitialValues, email: 'manager@duncit.com', password: 'secret123' };

/** Collect every zod issue message for a value into one searchable string. */
const messages = (value: unknown): string => {
  const result = loginSchema.safeParse(value);
  return result.success ? '' : result.error.issues.map((i) => i.message).join(' ');
};

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toMatchObject({ email: 'manager@duncit.com' });
  });

  it('requires both fields', () => {
    const msg = messages({ email: '', password: '' });
    expect(msg).toMatch(/email/i);
    expect(msg).toMatch(/password/i);
  });

  it('rejects an invalid email', () => {
    expect(messages({ ...valid, email: 'not-an-email' })).toMatch(/valid email/i);
  });

  it('rejects a short password', () => {
    expect(messages({ ...valid, password: 'short' })).toMatch(/at least 8/i);
  });

  it('normalises the email to lowercase', () => {
    const result = loginSchema.safeParse({ ...valid, email: 'Manager@Duncit.com' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('manager@duncit.com');
  });
});
