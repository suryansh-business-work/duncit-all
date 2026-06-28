import { describe, expect, it } from 'vitest';
import {
  currentPasswordSchema,
  currentPasswordDefaults,
  newPasswordSchema,
  newPasswordDefaults,
} from './change-password.types';

const validNew = { otp: '123456', new_password: 'StrongPass123', confirm_password: 'StrongPass123' };

const firstError = (result: ReturnType<typeof newPasswordSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('currentPasswordSchema', () => {
  it('exposes an empty default', () => {
    expect(currentPasswordDefaults).toEqual({ current_password: '' });
  });

  it('requires the current password', () => {
    expect(currentPasswordSchema.safeParse({ current_password: '' }).success).toBe(false);
  });

  it('accepts any non-empty current password', () => {
    expect(currentPasswordSchema.safeParse({ current_password: 'anything' }).success).toBe(true);
  });
});

describe('newPasswordSchema', () => {
  it('exposes empty defaults', () => {
    expect(newPasswordDefaults).toEqual({ otp: '', new_password: '', confirm_password: '' });
  });

  it('requires a 6-digit OTP', () => {
    expect(newPasswordSchema.safeParse({ ...validNew, otp: '12' }).success).toBe(false);
    expect(firstError(newPasswordSchema.safeParse({ ...validNew, otp: 'abcdef' }))).toMatch(
      /6 digit/i,
    );
  });

  it('requires an 8+ char new password', () => {
    expect(
      firstError(
        newPasswordSchema.safeParse({ ...validNew, new_password: 'short', confirm_password: 'short' }),
      ),
    ).toMatch(/8 characters/i);
  });

  it('flags a confirm mismatch', () => {
    const result = newPasswordSchema.safeParse({ ...validNew, confirm_password: 'Different123' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/do not match/i);
  });

  it('accepts a valid payload', () => {
    expect(newPasswordSchema.safeParse(validNew).success).toBe(true);
  });
});
