// login + register were migrated to RHF + Zod (see ../login and ../register).
// This module now owns only the still-Formik/Yup flows: Google signup + WhatsApp OTP.
export {
  googleSignupSchema,
  whatsAppOtpRequestSchema,
  whatsAppOtpVerifySchema,
} from './auth.form';
export type {
  GoogleSignupFormValues,
  WhatsAppOtpRequestValues,
  WhatsAppOtpVerifyValues,
} from './auth.types';
