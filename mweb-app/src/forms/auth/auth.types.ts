import type * as yup from 'yup';
import type {
  loginSchema,
  registerSchema,
  googleSignupSchema,
  whatsAppOtpRequestSchema,
  whatsAppOtpVerifySchema,
} from './auth.form';

export type LoginFormValues = yup.InferType<typeof loginSchema>;
export type RegisterFormValues = yup.InferType<typeof registerSchema>;
export type GoogleSignupFormValues = yup.InferType<typeof googleSignupSchema>;
export type WhatsAppOtpRequestValues = yup.InferType<typeof whatsAppOtpRequestSchema>;
export type WhatsAppOtpVerifyValues = yup.InferType<typeof whatsAppOtpVerifySchema>;
