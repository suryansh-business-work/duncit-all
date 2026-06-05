import { describe, expect, it } from 'vitest';
import { resetPasswordSchema, resetPasswordDefaults } from './reset-password.types';

const valid = { otp: '123456', new_password: 'StrongPass123', confirm_password: 'StrongPass123' };

const firstError = (result: ReturnType<typeof resetPasswordSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('resetPasswordSchema', () => {
  it('exposes empty defaults', () => {
    expect(resetPasswordDefaults).toEqual({ otp: '', new_password: '', confirm_password: '' });
  });

  it('requires a 6-digit OTP', () => {
    expect(resetPasswordSchema.safeParse({ ...valid, otp: '12' }).success).toBe(false);
    expect(firstError(resetPasswordSchema.safeParse({ ...valid, otp: 'abcdef' }))).toMatch(/6 digit/i);
  });

  it('requires an 8+ char password', () => {
    expect(firstError(resetPasswordSchema.safeParse({ ...valid, new_password: 'short', confirm_password: 'short' }))).toMatch(
      /8 characters/i,
    );
  });

  it('flags a confirm mismatch', () => {
    const result = resetPasswordSchema.safeParse({ ...valid, confirm_password: 'Different123' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/do not match/i);
  });

  it('accepts a valid payload', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });
});
