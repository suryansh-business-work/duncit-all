import { describe, expect, it } from 'vitest';
import { deleteAccountSchema, deleteAccountDefaults } from './delete-account.types';

const firstError = (result: ReturnType<typeof deleteAccountSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('deleteAccountSchema', () => {
  it('exposes an empty default', () => {
    expect(deleteAccountDefaults).toEqual({ otp: '' });
  });

  it('requires a 6-digit OTP', () => {
    expect(deleteAccountSchema.safeParse({ otp: '12' }).success).toBe(false);
    expect(firstError(deleteAccountSchema.safeParse({ otp: 'abcdef' }))).toMatch(/6 digit/i);
  });

  it('accepts a valid 6-digit OTP', () => {
    expect(deleteAccountSchema.safeParse({ otp: '123456' }).success).toBe(true);
  });
});
