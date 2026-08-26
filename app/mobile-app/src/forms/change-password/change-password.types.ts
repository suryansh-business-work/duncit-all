import { z } from 'zod';

/**
 * Change-password contracts — RN twin of mWeb's change-password forms (RHF +
 * Zod). Two steps: verify the current password to request an OTP, then enter
 * the emailed OTP + a new password (confirmed) to commit the change. Mirrors
 * the server's `requestPasswordChangeOtp` / `changePasswordWithOtp` rules.
 */
export const currentPasswordSchema = z.object({
  current_password: z.string().min(1, 'Enter your current password'),
});

export type CurrentPasswordValues = z.infer<typeof currentPasswordSchema>;

export const currentPasswordDefaults: CurrentPasswordValues = {
  current_password: '',
};

/**
 * Step 2's contract. `currentPassword` is the one step 1 already verified, so
 * reusing it is rejected on the field instead of coming back as a server error
 * after the OTP was spent.
 */
export const makeNewPasswordSchema = (currentPassword = '') =>
  z
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
    })
    .refine((data) => !currentPassword || data.new_password !== currentPassword, {
      message: 'New password must be different from your current password',
      path: ['new_password'],
    });

export const newPasswordSchema = makeNewPasswordSchema();

export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

export const newPasswordDefaults: NewPasswordValues = {
  otp: '',
  new_password: '',
  confirm_password: '',
};
