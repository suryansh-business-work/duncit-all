import { describe, expect, it } from 'vitest';
import {
  loginSchema,
  registerSchema,
  googleSignupSchema,
  whatsAppOtpRequestSchema,
  whatsAppOtpVerifySchema,
} from './auth.form';

const today = new Date();
const minus18 = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

const validRegister = {
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  phone_number: '9876543210',
  phone_extension: '+91',
  password: 'longenough',
  dob: minus18,
  city: 'Bengaluru',
  zone: 'HSR',
};

interface Parseable {
  safeParse: (values: unknown) => { error?: { issues: { message: string }[] } };
}

const messagesOf = (schema: Parseable, values: unknown) =>
  (schema.safeParse(values).error?.issues ?? []).map((issue) => issue.message).join(' ');

describe('loginSchema', () => {
  it('rejects empty fields', () => {
    const messages = messagesOf(loginSchema, { email: '', password: '' });
    expect(messages).toMatch(/email/i);
    expect(messages).toMatch(/min 8 characters/i);
  });
  it('reports a missing password as required', () => {
    expect(messagesOf(loginSchema, { email: 'jane@example.com' })).toMatch(/password/i);
  });
  it('rejects invalid email', () => {
    expect(messagesOf(loginSchema, { email: 'bad', password: 'longenough' })).toMatch(/email/i);
  });
});

describe('registerSchema', () => {
  it('rejects names with special chars', () => {
    expect(messagesOf(registerSchema, { ...validRegister, first_name: 'Jane@!' })).toMatch(/first name/i);
  });
  it('rejects phone with alphabetic characters', () => {
    expect(messagesOf(registerSchema, { ...validRegister, phone_number: 'abc123' })).toMatch(/digits/i);
  });
  it('rejects users younger than 13', () => {
    const tooYoung = new Date(today.getFullYear() - 10, 0, 1);
    expect(messagesOf(registerSchema, { ...validRegister, dob: tooYoung })).toMatch(/13/);
  });
  it('rejects city shorter than 2 chars', () => {
    expect(messagesOf(registerSchema, { ...validRegister, city: 'A' })).toMatch(/city/i);
  });
  it('accepts a fully valid register payload', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });
});

describe('googleSignupSchema', () => {
  it('rejects empty phone', () => {
    expect(
      messagesOf(googleSignupSchema, { phone_number: '', phone_extension: '+91', dob: minus18, city: 'Bengaluru', zone: 'HSR' })
    ).toMatch(/phone/i);
  });
});

describe('whatsAppOtpRequestSchema', () => {
  it('requires a 6+ digit number', () => {
    expect(messagesOf(whatsAppOtpRequestSchema, { phone_extension: '+91', phone_number: '12' })).toMatch(/digits/i);
  });
});

describe('whatsAppOtpVerifySchema', () => {
  it('rejects non-numeric OTP', () => {
    expect(messagesOf(whatsAppOtpVerifySchema, { otp: 'abcd' })).toMatch(/otp/i);
  });
  it('accepts 4-8 digit OTP', () => {
    expect(whatsAppOtpVerifySchema.safeParse({ otp: '1234' }).success).toBe(true);
    expect(whatsAppOtpVerifySchema.safeParse({ otp: '12345678' }).success).toBe(true);
  });
});
