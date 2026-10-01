import { describe, expect, it } from 'vitest';
import { googleSignupSchema } from './auth.form';

const errorText = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message).join(' ');

// login + register moved to RHF + Zod — see ../login and ../register.
// WhatsApp OTP moved to RHF + Zod — see ../whatsapp-otp/whatsapp-otp.form.cy.ts.
// This file covers the remaining schema here: Google signup.

const today = new Date();
const minus18 = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

describe('googleSignupSchema', () => {
  it('rejects empty phone', () => {
    const result = googleSignupSchema.safeParse({
      phone_number: '',
      phone_extension: '+91',
      dob: minus18,
      city: 'Bengaluru',
      zone: 'HSR',
    });
    expect(errorText(result)).toMatch(/phone/i);
  });
  it('accepts a fully valid google signup payload', () => {
    const result = googleSignupSchema.safeParse({
      phone_number: '9876543210',
      phone_extension: '+91',
      dob: minus18,
      city: 'Bengaluru',
      zone: 'HSR',
    });
    expect(result.success).toBe(true);
  });
});
