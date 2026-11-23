import { Types } from 'mongoose';
import { z } from 'zod';
import { EXCEPTION_REASON_MAX, EXCEPTION_REASON_MIN, LOCATION_ERROR_CODES } from './portalSecurity.constants';

/**
 * What the verification screen is allowed to send.
 *
 * Every acknowledgement is a literal `true` — a missing or false tick is a
 * refusal with the message the person can act on, never a silent default. The
 * same rules run on the screen (it disables the button until they hold); this
 * is the copy that cannot be skipped by calling the mutation by hand.
 */
const tick = (message: string) => z.literal(true, { error: message });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

export const locationFixSchema = z.object({
  latitude: z.number({ error: 'latitude must be a number' }).min(-90, 'latitude must be between -90 and 90').max(90, 'latitude must be between -90 and 90'),
  longitude: z
    .number({ error: 'longitude must be a number' })
    .min(-180, 'longitude must be between -180 and 180')
    .max(180, 'longitude must be between -180 and 180'),
  accuracy_meters: z
    .number({ error: 'accuracy_meters must be a number' })
    .min(0, 'accuracy_meters cannot be negative')
    .max(1_000_000, 'accuracy_meters is not a plausible accuracy'),
});

export const verificationInputSchema = z
  .object({
    policy_version: z.string().trim().min(1, 'policy_version is required').max(120),
    consent: z.object({
      authorized_person: tick('Confirm that you are an authorised Duncit employee or approved person'),
      credentials_not_shared: tick('Confirm that you have not shared your login credentials'),
      policies_acknowledged: tick('Acknowledge the security monitoring, IP logging and privacy policies'),
      location_consent: z.boolean({ error: 'location_consent is required' }),
    }),
    location: locationFixSchema.nullish(),
    exception_id: z
      .string()
      .refine((id) => Types.ObjectId.isValid(id), 'exception_id is not valid')
      .nullish(),
    client: z
      .object({
        timezone: optionalText(80),
        language: optionalText(40),
        platform: optionalText(80),
      })
      .nullish(),
  })
  .superRefine((value, ctx) => {
    // The administrator-approved alternative replaces the location, not the
    // acknowledgements. Without one, a consented location fix is what verifies.
    if (value.exception_id) return;
    if (!value.consent.location_consent) {
      ctx.addIssue({
        code: 'custom',
        path: ['consent', 'location_consent'],
        message: 'Consent to share your current location is required, or request an administrator-approved alternative',
      });
    }
    if (!value.location) {
      ctx.addIssue({
        code: 'custom',
        path: ['location'],
        message: 'Your current location is required to verify',
      });
    }
  });

export type VerificationInput = z.infer<typeof verificationInputSchema>;

export const exceptionRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(EXCEPTION_REASON_MIN, `Tell the administrator why in at least ${EXCEPTION_REASON_MIN} characters`)
    .max(EXCEPTION_REASON_MAX, `Keep the reason within ${EXCEPTION_REASON_MAX} characters`),
  location_error: z.enum(LOCATION_ERROR_CODES).nullish(),
});

export type ExceptionRequestInput = z.infer<typeof exceptionRequestSchema>;

export const exceptionDecisionSchema = z.object({
  id: z.string().refine((id) => Types.ObjectId.isValid(id), 'id is not valid'),
  approve: z.boolean({ error: 'approve is required' }),
  note: optionalText(300),
});

export type ExceptionDecisionInput = z.infer<typeof exceptionDecisionSchema>;
