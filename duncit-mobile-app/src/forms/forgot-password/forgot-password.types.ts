import { z } from 'zod';

/** Forgot-password contract — the email we send the reset OTP to. Mirrors mWeb. */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(254),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const forgotPasswordDefaults: ForgotPasswordValues = { email: '' };
