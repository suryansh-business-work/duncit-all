import { describe, expect, it } from 'vitest';
import {
  googleSignupSchema,
  whatsAppOtpRequestSchema,
  whatsAppOtpVerifySchema,
} from './auth.form';

// login + register validation moved to RHF + Zod — see ../login/login.form.cy.ts
// and ../register/register.form.cy.ts. This file covers the remaining yup flows.

const today = new Date();
const minus18 = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

describe('googleSignupSchema', () => {
  it('rejects empty phone', async () => {
    const error = await googleSignupSchema
      .validate(
        { phone_number: '', phone_extension: '+91', dob: minus18, city: 'Bengaluru', zone: 'HSR' },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/phone/i);
  });
  it('accepts a fully valid google signup payload', async () => {
    await googleSignupSchema.validate({
      phone_number: '9876543210',
      phone_extension: '+91',
      dob: minus18,
      city: 'Bengaluru',
      zone: 'HSR',
    });
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
    await whatsAppOtpVerifySchema.validate({ otp: '1234' });
    await whatsAppOtpVerifySchema.validate({ otp: '12345678' });
  });
});
