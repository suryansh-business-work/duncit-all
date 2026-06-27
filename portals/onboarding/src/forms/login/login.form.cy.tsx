import { describe, expect, it } from 'vitest';
import { loginSchema } from './login.form';
import { loginInitialValues } from './login.types';

const valid = { ...loginInitialValues, email: 'manager@duncit.com', password: 'secret123' };

const messages = (value: unknown) => {
  const result = loginSchema.safeParse(value);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.success && result.data.email).toBe('manager@duncit.com');
  });

  it('requires both fields', () => {
    const errors = messages({ email: '', password: '' });
    expect(errors).toMatch(/email/i);
    expect(errors).toMatch(/password/i);
  });

  it('rejects an invalid email', () => {
    expect(messages({ ...valid, email: 'not-an-email' })).toMatch(/valid email/i);
  });

  it('rejects a short password', () => {
    expect(messages({ ...valid, password: 'short' })).toMatch(/at least 8/i);
  });

  it('normalises the email to lowercase', () => {
    const result = loginSchema.safeParse({ ...valid, email: 'Manager@Duncit.com' });
    expect(result.success && result.data.email).toBe('manager@duncit.com');
  });
});
