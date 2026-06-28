import { z } from 'zod';

/**
 * Change-password contracts — RHF + Zod. The flow is two steps:
 *  1. Verify the current password to request an OTP.
 *  2. Enter the emailed OTP + a new password (confirmed) to commit the change.
 * Mirrors the server's `requestPasswordChangeOtp` / `changePasswordWithOtp`
 * validation plus a client-only confirm match.
 */
export const currentPasswordSchema = z.object({
  current_password: z.string().min(1, 'Enter your current password'),
});

export type CurrentPasswordValues = z.infer<typeof currentPasswordSchema>;

export const currentPasswordDefaults: CurrentPasswordValues = {
  current_password: '',
};

export const newPasswordSchema = z
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

export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

export const newPasswordDefaults: NewPasswordValues = {
  otp: '',
  new_password: '',
  confirm_password: '',
};
