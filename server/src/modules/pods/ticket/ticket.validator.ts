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
export const podCompanionSchema = yup.object({
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

export type PodCompanionDTO = yup.InferType<typeof podCompanionSchema>;
