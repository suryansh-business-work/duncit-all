import { z } from 'zod';
import { PHONE_EXTENSION_REGEX, PHONE_NUMBER_REGEX } from '@utils/phone';
import { arr, filled, matches, maxLen, minLen, obj, shape, str, trim } from '@utils/zod-fields';

const PHONE_DIGITS = 'Phone must contain only digits (6-15 digits)';

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
  name: str(z.string().check(minLen(2, 'Enter the full name'), maxLen(120, 'Name is too long'), filled('Name is required')), {
    required: 'Name is required',
    transforms: [trim],
  }),
  phone_extension: str(
    z.string().check(matches(PHONE_EXTENSION_REGEX, { message: 'Phone code is invalid', excludeEmptyString: true })).nullable(),
    { transforms: [trim], default: null }
  ),
};

const podCompanionShape = shape({
  ...companionIdentityFields,
  phone_number: str(z.string().check(matches(PHONE_NUMBER_REGEX, PHONE_DIGITS), filled('Phone number is required')), {
    required: 'Phone number is required',
    transforms: [trim],
  }),
  /**
   * A verified POD_COMPANION challenge, when the host proved this number.
   *
   * Optional: an attendee whose phone is dead or abroad must still be able to
   * walk in, so the code is an option the host takes rather than a gate. When
   * it IS supplied the service spends it, which is what stops one proof being
   * replayed across the rest of the group.
   */
  otp_challenge_id: str(z.string().nullable(), { transforms: [trim], default: null }),
});

export const podCompanionSchema = obj(podCompanionShape);

export const podCompanionsSchema = obj(
  shape({ companions: arr(z.array(obj(podCompanionShape, { required: true })), { default: [] }) })
);

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
const podForcedCompanionShape = shape({
  ...companionIdentityFields,
  phone_number: str(
    z.string().check(matches(PHONE_NUMBER_REGEX, { message: PHONE_DIGITS, excludeEmptyString: true })),
    { transforms: [trim], default: '' }
  ),
});

export const podForcedCompanionSchema = obj(podForcedCompanionShape);

export const podForcedCompanionsSchema = obj(
  shape({ companions: arr(z.array(obj(podForcedCompanionShape, { required: true })), { default: [] }) })
);

export type PodForcedCompanionDTO = z.infer<typeof podForcedCompanionSchema>;

export type PodCompanionDTO = z.infer<typeof podCompanionSchema>;
