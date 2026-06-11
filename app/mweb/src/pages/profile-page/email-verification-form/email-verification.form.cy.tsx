import { describe, expect, it } from 'vitest';
import { emailVerificationSchema } from './email-verification.form';

describe('emailVerificationSchema', () => {
  it('rejects missing OTP', async () => {
    const error = await emailVerificationSchema
      .validate({ otp: '' }, { abortEarly: false })
      .catch((validationError) => validationError);
    expect(error.errors.join(' ')).toMatch(/otp/i);
  });

  it('rejects non-numeric OTP', async () => {
    const error = await emailVerificationSchema
      .validate({ otp: 'abc123' }, { abortEarly: false })
      .catch((validationError) => validationError);
    expect(error.errors.join(' ')).toMatch(/otp/i);
  });

  it('accepts a valid OTP', async () => {
    const parsed = await emailVerificationSchema.validate({ otp: '123456' });
    expect(parsed.otp).toBe('123456');
  });
});