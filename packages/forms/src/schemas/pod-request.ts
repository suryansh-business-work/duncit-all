import { z } from 'zod';

import type { Translate } from './translate';

/** The server's own cap (`PARTNER_REQUEST_NOTE_MAX`): the note travels with the request. */
export const POD_REQUEST_NOTE_MAX = 500;
/** The most an admin may set as a partner's monthly Pod Request limit — the server refuses past it. */
export const POD_REQUEST_OVERRIDE_MAX = 1000;

/** Typed text → whole number in range. A blank box is refused, never read as 0 (`Number('')` is 0). */
const wholeNumber = (max: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.coerce.number({ message }).int(message).min(0, message).max(max, message)
  );

/**
 * The optional note a venue or host sends with a Pod Request. The Partners
 * console, mWeb and the native app post the same `sendPodPartnerRequest`, so
 * the rule lives once here (rules 27 + 40); refusals are `podRequests.*` keys.
 */
export function makePodRequestNoteSchema(t: Translate) {
  return z.object({
    note: z
      .string()
      .trim()
      .max(POD_REQUEST_NOTE_MAX, t('podRequests.noteTooLong', { vars: { max: POD_REQUEST_NOTE_MAX } })),
  });
}

export type PodRequestNoteValues = z.infer<ReturnType<typeof makePodRequestNoteSchema>>;

/**
 * The admin-only monthly Pod Request limit (Venues / Hosts portals and Onboarding): empty clears
 * it (null, the default of 10 applies), else a whole number up to POD_REQUEST_OVERRIDE_MAX.
 */
export function makePodRequestOverrideSchema(t: Translate) {
  const message = t('podRequests.overrideInvalid');
  return z.object({
    limit: z.union([z.literal('').transform(() => null), wholeNumber(POD_REQUEST_OVERRIDE_MAX, message)], { message }),
  });
}
