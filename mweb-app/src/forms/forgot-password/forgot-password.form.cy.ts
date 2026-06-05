import { describe, expect, it } from 'vitest';
import { forgotPasswordSchema, forgotPasswordDefaults } from './forgot-password.types';

const firstError = (result: ReturnType<typeof forgotPasswordSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('forgotPasswordSchema', () => {
  it('exposes an empty default', () => {
    expect(forgotPasswordDefaults).toEqual({ email: '' });
  });

  it('requires an email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/email is required/i);
  });

  it('rejects an invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/valid email/i);
  });

  it('trims and accepts a valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '  jane@example.com  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('jane@example.com');
  });
});
