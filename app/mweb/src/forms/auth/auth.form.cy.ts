import { describe, expect, it } from 'vitest';
import { googleSignupSchema } from './auth.form';

// login + register moved to RHF + Zod — see ../login and ../register.
// WhatsApp OTP moved to RHF + Zod — see ../whatsapp-otp/whatsapp-otp.form.cy.ts.
// This file covers the remaining yup flow: Google signup.

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
    await expect(
      googleSignupSchema.validate({
        phone_number: '9876543210',
        phone_extension: '+91',
        dob: minus18,
        city: 'Bengaluru',
        zone: 'HSR',
      }),
    ).resolves.toBeTruthy();
  });
});
