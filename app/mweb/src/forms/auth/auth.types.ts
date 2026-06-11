import type * as yup from 'yup';
import type {
  googleSignupSchema,
  whatsAppOtpRequestSchema,
  whatsAppOtpVerifySchema,
} from './auth.form';

export type GoogleSignupFormValues = yup.InferType<typeof googleSignupSchema>;
export type WhatsAppOtpRequestValues = yup.InferType<typeof whatsAppOtpRequestSchema>;
export type WhatsAppOtpVerifyValues = yup.InferType<typeof whatsAppOtpVerifySchema>;
