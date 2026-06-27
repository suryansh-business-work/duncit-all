import { z } from 'zod';

export const PHONE_NUMBER_PATTERN = /^\d{6,15}$/;
export const PHONE_EXTENSION_PATTERN = /^\+?\d{1,5}$/;
export const OTP_PATTERN = /^[0-9]{4,8}$/;

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
