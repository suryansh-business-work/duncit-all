import { describe, expect, it } from 'vitest';
import { loginSchema } from './login.form';
import { loginInitialValues } from './login.types';

const valid = { ...loginInitialValues, email: 'manager@duncit.com', password: 'secret123' };

const firstError = (result: ReturnType<typeof loginSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('manager@duncit.com');
  });

  it('requires both fields', () => {
    const result = loginSchema.safeParse({ email: '', password: '' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/email/i);
    expect(firstError(result)).toMatch(/password/i);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/valid email/i);
  });

  it('rejects a short password', () => {
    const result = loginSchema.safeParse({ ...valid, password: 'short' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/at least 8/i);
  });

  it('normalises the email to lowercase', () => {
    const result = loginSchema.safeParse({ ...valid, email: 'Manager@Duncit.com' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('manager@duncit.com');
  });
});
