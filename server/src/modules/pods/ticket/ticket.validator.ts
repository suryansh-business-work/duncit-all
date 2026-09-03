import * as yup from 'yup';
import { PHONE_EXTENSION_REGEX, PHONE_NUMBER_REGEX } from '@utils/phone';

/**
 * Who else is coming in on this ticket.
 *
 * Shapes only — how MANY are required depends on the booking's seat count, which
 * this schema cannot see, so the service enforces that. Every field the caller
 * sends is declared here, because `validate()` strips anything that is not: an
 * undeclared field is deleted in silence, which is exactly how a multi-seat
 * booking ended up charging for one seat.
 */
/** Who they are, and what to dial before the number. Identical on both doors —
 * only whether a NUMBER is owed differs, which is the field below. */
const companionIdentityFields = {
  name: yup
    .string()
    .trim()
    .min(2, 'Enter the full name')
    .max(120, 'Name is too long')
    .required('Name is required'),
  phone_extension: yup
    .string()
    .trim()
    .matches(PHONE_EXTENSION_REGEX, {
      message: 'Phone code is invalid',
      excludeEmptyString: true,
    })
    .nullable()
    .default(null),
};

export const podCompanionSchema = yup.object({
  ...companionIdentityFields,
  phone_number: yup
    .string()
    .trim()
    .matches(PHONE_NUMBER_REGEX, 'Phone must contain only digits (6-15 digits)')
    .required('Phone number is required'),
  /**
   * A verified POD_COMPANION challenge, when the host proved this number.
   *
   * Optional: an attendee whose phone is dead or abroad must still be able to
   * walk in, so the code is an option the host takes rather than a gate. When
   * it IS supplied the service spends it, which is what stops one proof being
   * replayed across the rest of the group.
   */
  otp_challenge_id: yup.string().trim().nullable().default(null),
});

export const podCompanionsSchema = yup.object({
  companions: yup.array().of(podCompanionSchema.required()).default([]),
});

/**
 * The same people, as a Club Admin is given them.
 *
 * A separate schema rather than a looser `podCompanionSchema`, because the two
 * are asked in different rooms. At the door the host has the group in front of
 * them, so a number is reasonable and is what makes the seat contestable later.
 * A Club Admin correcting a roster the host forgot is read names down a phone
 * line — demanding a number there is demanding they ring every attendee, which
 * is the exact call this path exists to avoid. So: a name, and whatever else
 * they happen to have.
 *
 * No `otp_challenge_id`: a companion proved by code belongs to the door's flow,
 * and `validate()` strips anything not declared here, so it cannot be smuggled
 * in through this one.
 */
export const podForcedCompanionSchema = yup.object({
  ...companionIdentityFields,
  phone_number: yup
    .string()
    .trim()
    .matches(PHONE_NUMBER_REGEX, {
      message: 'Phone must contain only digits (6-15 digits)',
      excludeEmptyString: true,
    })
    .default(''),
});

export const podForcedCompanionsSchema = yup.object({
  companions: yup.array().of(podForcedCompanionSchema.required()).default([]),
});

export type PodForcedCompanionDTO = yup.InferType<typeof podForcedCompanionSchema>;

export type PodCompanionDTO = yup.InferType<typeof podCompanionSchema>;
