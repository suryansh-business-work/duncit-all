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

describe('loginSchema', () => {
  it('rejects empty fields', async () => {
    const error = await loginSchema.validate({ email: '', password: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/email/i);
    expect(error.errors.join(' ')).toMatch(/password/i);
  });
  it('rejects invalid email', async () => {
    const error = await loginSchema.validate({ email: 'bad', password: 'longenough' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/email/i);
  });
});

describe('registerSchema', () => {
  it('rejects names with special chars', async () => {
    const error = await registerSchema
      .validate({ ...validRegister, first_name: 'Jane@!' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/first name/i);
  });
  it('rejects phone with alphabetic characters', async () => {
    const error = await registerSchema
      .validate({ ...validRegister, phone_number: 'abc123' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/digits/i);
  });
  it('rejects users younger than 13', async () => {
    const tooYoung = new Date(today.getFullYear() - 10, 0, 1);
    const error = await registerSchema
      .validate({ ...validRegister, dob: tooYoung }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/13/);
  });
  it('rejects city shorter than 2 chars', async () => {
    const error = await registerSchema
      .validate({ ...validRegister, city: 'A' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/city/i);
  });
  it('accepts a fully valid register payload', async () => {
    await expect(registerSchema.validate(validRegister, { abortEarly: false })).resolves.toBeTruthy();
  });
});

describe('googleSignupSchema', () => {
  it('rejects empty phone', async () => {
    const error = await googleSignupSchema
      .validate({ phone_number: '', phone_extension: '+91', dob: minus18, city: 'Bengaluru', zone: 'HSR' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/phone/i);
  });
});

describe('whatsAppOtpRequestSchema', () => {
  it('requires a 6+ digit number', async () => {
    const error = await whatsAppOtpRequestSchema
      .validate({ phone_extension: '+91', phone_number: '12' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/digits/i);
  });
});

describe('whatsAppOtpVerifySchema', () => {
  it('rejects non-numeric OTP', async () => {
    const error = await whatsAppOtpVerifySchema
      .validate({ otp: 'abcd' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/otp/i);
  });
  it('accepts 4-8 digit OTP', async () => {
    await expect(whatsAppOtpVerifySchema.validate({ otp: '1234' })).resolves.toBeTruthy();
    await expect(whatsAppOtpVerifySchema.validate({ otp: '12345678' })).resolves.toBeTruthy();
  });
});
