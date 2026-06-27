import { describe, expect, it } from 'vitest';
import {
  whatsAppOtpRequestSchema,
  whatsAppOtpVerifySchema,
  whatsAppOtpRequestDefaults,
  whatsAppOtpVerifyDefaults,
} from './whatsapp-otp.types';

const firstError = (
  result: ReturnType<typeof whatsAppOtpRequestSchema.safeParse>,
) => (result.success ? '' : result.error.issues.map((i) => i.message).join(' '));

describe('whatsAppOtpRequestSchema', () => {
  it('exposes +91 as the default code', () => {
    expect(whatsAppOtpRequestDefaults.phone_extension).toBe('+91');
    expect(whatsAppOtpRequestDefaults.phone_number).toBe('');
  });

  it('accepts a valid request payload', () => {
    expect(
      whatsAppOtpRequestSchema.safeParse({ phone_extension: '+91', phone_number: '9876543210' })
        .success,
    ).toBe(true);
  });

  it('requires a 6+ digit number', () => {
    const result = whatsAppOtpRequestSchema.safeParse({ phone_extension: '+91', phone_number: '12' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/digits/i);
  });

  it('rejects an empty number', () => {
    const result = whatsAppOtpRequestSchema.safeParse({ phone_extension: '+91', phone_number: '' });
    expect(firstError(result)).toMatch(/whatsapp number is required/i);
  });

  it('rejects an invalid phone code', () => {
    const result = whatsAppOtpRequestSchema.safeParse({
      phone_extension: 'abc',
      phone_number: '9876543210',
    });
    expect(firstError(result)).toMatch(/code is invalid/i);
  });
});

describe('whatsAppOtpVerifySchema', () => {
  it('exposes an empty otp default', () => {
    expect(whatsAppOtpVerifyDefaults.otp).toBe('');
  });

  it('rejects non-numeric OTP', () => {
    const result = whatsAppOtpVerifySchema.safeParse({ otp: 'abcd' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/otp/i);
  });

  it('accepts 4-8 digit OTP', () => {
    expect(whatsAppOtpVerifySchema.safeParse({ otp: '1234' }).success).toBe(true);
    expect(whatsAppOtpVerifySchema.safeParse({ otp: '12345678' }).success).toBe(true);
  });

  it('rejects an empty OTP', () => {
    expect(firstError(whatsAppOtpVerifySchema.safeParse({ otp: '' }))).toMatch(/otp is required/i);
  });
});
