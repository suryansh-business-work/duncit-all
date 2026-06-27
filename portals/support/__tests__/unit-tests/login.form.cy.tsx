import { describe, expect, it } from 'vitest';
import { loginSchema } from '../../src/forms/login/login.form';
import { loginInitialValues } from '../../src/forms/login/login.types';

const valid = { ...loginInitialValues, email: 'manager@duncit.com', password: 'secret123' };

const messages = (input: unknown) => {
  const result = loginSchema.safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({ email: 'manager@duncit.com' });
  });

  it('requires both fields', () => {
    const text = messages({ email: '', password: '' });
    expect(text).toMatch(/email/i);
    expect(text).toMatch(/password/i);
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
