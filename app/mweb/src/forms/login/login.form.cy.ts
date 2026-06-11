import { describe, expect, it } from 'vitest';
import { loginSchema, loginDefaults } from './login.types';

const valid = { email: 'jane@example.com', password: 'longenough' };

const firstError = (result: ReturnType<typeof loginSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('loginSchema', () => {
  it('exposes empty defaults', () => {
    expect(loginDefaults).toEqual({ email: '', password: '' });
  });

  it('rejects empty fields', () => {
    const result = loginSchema.safeParse({ email: '', password: '' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/email/i);
    expect(firstError(result)).toMatch(/characters/i);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ ...valid, email: 'bad' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/valid email/i);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = loginSchema.safeParse({ ...valid, password: 'short' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/8 characters/i);
  });

  it('trims the email and accepts a valid payload', () => {
    const result = loginSchema.safeParse({ email: '  jane@example.com  ', password: 'longenough' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('jane@example.com');
  });
});
