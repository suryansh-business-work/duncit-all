// login + register were migrated to RHF + Zod (see ../login and ../register);
// WhatsApp OTP migrated to RHF + Zod (see ../whatsapp-otp). This module now owns
// only the still-Formik/Yup Google signup flow.
export { googleSignupSchema } from './auth.form';
export type { GoogleSignupFormValues } from './auth.types';
