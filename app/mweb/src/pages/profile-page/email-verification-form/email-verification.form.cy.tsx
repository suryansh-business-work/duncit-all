import { describe, expect, it } from 'vitest';
import { emailVerificationSchema } from './email-verification.form';

const firstError = (result: ReturnType<typeof emailVerificationSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('emailVerificationSchema', () => {
  it('rejects missing OTP', () => {
    const result = emailVerificationSchema.safeParse({ otp: '' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/otp/i);
  });

  it('rejects non-numeric OTP', () => {
    const result = emailVerificationSchema.safeParse({ otp: 'abc123' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/otp/i);
  });

  it('accepts a valid OTP', () => {
    const result = emailVerificationSchema.safeParse({ otp: '123456' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.otp).toBe('123456');
  });
});
