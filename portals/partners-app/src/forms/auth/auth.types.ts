import type { z } from 'zod';
import type {
  loginSchema,
  registerSchema,
  googleSignupSchema,
  whatsAppOtpRequestSchema,
  whatsAppOtpVerifySchema,
} from './auth.form';

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type GoogleSignupFormValues = z.infer<typeof googleSignupSchema>;
export type WhatsAppOtpRequestValues = z.infer<typeof whatsAppOtpRequestSchema>;
export type WhatsAppOtpVerifyValues = z.infer<typeof whatsAppOtpVerifySchema>;
