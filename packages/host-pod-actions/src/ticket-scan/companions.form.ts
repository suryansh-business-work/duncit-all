import { z } from 'zod';
import {
  blankCompanionEntries,
  isOtpExtensionShape,
  isOtpPhoneShape,
} from '@duncit/utils';
import type { HostPodActionLabels } from '../labels';

/**
 * The rest of the group, as the door's form holds them.
 *
 * Built per render rather than at module scope so the messages come from the
 * bundle. A module-level schema cannot reach the labels, which is how the first
 * version ended up with two shipped keys nothing rendered — caught by
 * verify-translation-keys, not by tsc.
 *
 * What counts as a phone number is decided in `@duncit/utils`, so the Tamagui
 * twin (rule 27) accepts exactly what this does. `otp_challenge_id` carries the
 * proof and is deliberately NOT validated: a number that cannot be reached must
 * still be able to walk in.
 */
export const buildCompanionsSchema = (labels: HostPodActionLabels) =>
  z.object({
    companions: z
      .array(
        z.object({
          name: z.string().trim().min(2, labels.nameInvalid).max(120),
          phone_extension: z.string().refine(isOtpExtensionShape, labels.otpExtensionInvalid),
          phone_number: z.string().refine(isOtpPhoneShape, labels.phoneInvalid),
          otp_challenge_id: z.string(),
        }),
      )
      .min(1),
  });

export type CompanionValues = z.infer<ReturnType<typeof buildCompanionsSchema>>;

/** One empty row per seat the booking still owes the door. */
export const companionsInitialValues = (required: number): CompanionValues => ({
  companions: blankCompanionEntries(required),
});

