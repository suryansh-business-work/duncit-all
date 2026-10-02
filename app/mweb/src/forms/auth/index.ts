// login + register were migrated to RHF + Zod (see ../login and ../register);
// WhatsApp OTP migrated to RHF + Zod (see ../whatsapp-otp). This module now owns
// only the Google signup schema, on Zod like the rest.
export { googleSignupSchema } from './auth.form';
export type { GoogleSignupFormValues } from './auth.types';
