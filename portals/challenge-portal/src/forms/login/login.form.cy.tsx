import { describe, expect, it } from 'vitest';
import { loginSchema } from './login.form';
import { loginInitialValues } from './login.types';

const valid = { ...loginInitialValues, email: 'manager@duncit.com', password: 'secret123' };

const messages = (result: ReturnType<typeof loginSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    expect(loginSchema.parse(valid)).toMatchObject({ email: 'manager@duncit.com' });
  });

  it('requires both fields', () => {
    const result = loginSchema.safeParse({ email: '', password: '' });
    expect(messages(result)).toMatch(/email/i);
    expect(messages(result)).toMatch(/8 characters/i);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(messages(result)).toMatch(/valid email/i);
  });

  it('rejects a short password', () => {
    const result = loginSchema.safeParse({ ...valid, password: 'short' });
    expect(messages(result)).toMatch(/at least 8/i);
  });

  it('rejects a too-long email', () => {
    const result = loginSchema.safeParse({ ...valid, email: `${'a'.repeat(250)}@duncit.com` });
    expect(messages(result)).toMatch(/too long/i);
  });

  it('rejects a too-long password', () => {
    const result = loginSchema.safeParse({ ...valid, password: 'a'.repeat(129) });
    expect(messages(result)).toMatch(/too long/i);
  });

  it('normalises the email to lowercase', () => {
    const parsed = loginSchema.parse({ ...valid, email: 'Manager@Duncit.com' });
    expect(parsed.email).toBe('manager@duncit.com');
  });
});
