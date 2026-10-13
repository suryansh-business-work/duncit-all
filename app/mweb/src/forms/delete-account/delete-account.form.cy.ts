import { describe, expect, it } from 'vitest';
import { deleteAccountSchema, deleteAccountDefaults } from './delete-account.types';

const firstError = (result: ReturnType<typeof deleteAccountSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('deleteAccountSchema', () => {
  it('exposes an empty default', () => {
    expect(deleteAccountDefaults).toEqual({ otp: '', reason: '' });
  });

  it('requires a 6-digit OTP', () => {
    expect(deleteAccountSchema.safeParse({ otp: '12', reason: '' }).success).toBe(false);
    expect(firstError(deleteAccountSchema.safeParse({ otp: 'abcdef', reason: '' }))).toMatch(/6 digit/i);
  });

  it('accepts a valid 6-digit OTP with a blank or short reason', () => {
    expect(deleteAccountSchema.safeParse({ otp: '123456', reason: '' }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ otp: '123456', reason: 'Moving away' }).success).toBe(true);
  });

  it('rejects a reason longer than 1000 characters', () => {
    expect(deleteAccountSchema.safeParse({ otp: '123456', reason: 'x'.repeat(1001) }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ otp: '123456', reason: 'x'.repeat(1000) }).success).toBe(true);
  });
});
