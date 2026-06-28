import { z } from 'zod';

/**
 * Delete-account contract — RHF + Zod. After requesting an OTP the user confirms
 * the permanent deletion by entering the 6-digit code. Mirrors the server's
 * `deleteMyAccount` validation.
 */
export const deleteAccountSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6 digit OTP'),
});

export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;

export const deleteAccountDefaults: DeleteAccountValues = {
  otp: '',
};
