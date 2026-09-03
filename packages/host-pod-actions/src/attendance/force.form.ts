import { z } from 'zod';
import {
  DEFAULT_DIAL_CODE,
  isOtpExtensionShape,
  isOtpPhoneShape,
  type PodAttendanceLabels,
} from '@duncit/utils';

/** One person a Club Admin was told about, as the dialog holds them. */
export interface ForceCompanionValues {
  name: string;
  phone_extension: string;
  phone_number: string;
}

export interface ForceMarkValues {
  companions: ForceCompanionValues[];
}

/**
 * `count` empty rows, one per seat still unaccounted for.
 *
 * Deliberately NOT `blankCompanionEntries`: that shape carries the verified
 * challenge id the door's form fills in, and this path never verifies a
 * companion — a name is what the admin was given.
 */
export const forceMarkInitialValues = (count: number): ForceMarkValues => ({
  companions: Array.from({ length: Math.max(count, 0) }, () => ({
    name: '',
    phone_extension: DEFAULT_DIAL_CODE,
    phone_number: '',
  })),
});

/**
 * Every field optional, every filled field checked.
 *
 * The admin is recording what a phone call told them, so a blank row is a
 * legitimate answer — "I was not given that name" must not hold the mark. What
 * IS enforced is that anything they did type is usable: a one-letter name or
 * half a phone number on the roster is worse than an empty row, because it
 * reads as a record.
 */
export const buildForceMarkSchema = (labels: PodAttendanceLabels) =>
  z.object({
    companions: z.array(
      z.object({
        name: z
          .string()
          .trim()
          .refine((v) => v === '' || v.length >= 2, labels.otpNameRequired),
        phone_extension: z
          .string()
          .refine((v) => v.trim() === '' || isOtpExtensionShape(v), labels.otpExtensionInvalid),
        phone_number: z
          .string()
          .refine((v) => v.trim() === '' || isOtpPhoneShape(v), labels.otpPhoneInvalid),
      })
    ),
  });
