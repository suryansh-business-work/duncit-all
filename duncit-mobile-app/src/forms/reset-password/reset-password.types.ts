import { z } from 'zod';

/**
 * Reset-password contract — 6-digit OTP + a new password confirmed twice.
 * Mirrors the server's `resetPasswordWithOtp` rules plus a client confirm match.
 */
export const resetPasswordSchema = z
  .object({
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6 digit OTP'),
    new_password: z.string().min(8, 'Min 8 characters').max(100, 'Password is too long'),
    confirm_password: z.string().min(8, 'Min 8 characters'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const resetPasswordDefaults: ResetPasswordFormValues = {
  otp: '',
  new_password: '',
  confirm_password: '',
};
