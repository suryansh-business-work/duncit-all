import { z } from 'zod';
import { DIAL_CODE, OTP_6, PHONE_INTL } from '@duncit/regex';

/*
  Re-exported, not re-declared: @duncit/regex is the one place a dial code, a
  phone number and a one-time code are described (rule 40).

  The code is now OTP_6 rather than a 4-to-8 digit range. Every code the server
  issues is exactly six digits (otpService's CODE_LENGTH, and the email flows'
  randomInt(100000, 1000000)), so the wider rule only let a five- or
  seven-digit string through to a round trip that could never succeed.
*/
export const PHONE_NUMBER_PATTERN = PHONE_INTL;
export const PHONE_EXTENSION_PATTERN = DIAL_CODE;
export const OTP_PATTERN = OTP_6;

/**
 * WhatsApp OTP contracts — RHF + Zod (migrated from Formik + Yup). The two
 * schemas mirror the previous `whatsAppOtpRequestSchema` / `whatsAppOtpVerifySchema`
 * yup rules (phone code + 6–15 digit number for the request, 4–8 digit OTP for
 * the verify step).
 */
export const whatsAppOtpRequestSchema = z.object({
  phone_extension: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .regex(PHONE_EXTENSION_PATTERN, 'Code is invalid'),
  phone_number: z
    .string()
    .trim()
    .min(1, 'WhatsApp number is required')
    .regex(PHONE_NUMBER_PATTERN, 'WhatsApp number must contain only digits (6-15 digits)'),
});

export const whatsAppOtpVerifySchema = z.object({
  otp: z
    .string()
    .trim()
    .min(1, 'OTP is required')
    .regex(OTP_PATTERN, 'Enter the OTP we sent'),
});

export type WhatsAppOtpRequestValues = z.infer<typeof whatsAppOtpRequestSchema>;
export type WhatsAppOtpVerifyValues = z.infer<typeof whatsAppOtpVerifySchema>;

export const whatsAppOtpRequestDefaults: WhatsAppOtpRequestValues = {
  phone_extension: '+91',
  phone_number: '',
};

export const whatsAppOtpVerifyDefaults: WhatsAppOtpVerifyValues = { otp: '' };
