import { z } from 'zod';
import { makePodRequestOverrideSchema } from '@duncit/forms/schemas';
import type { Translate } from '../venues/editor/schema';

/**
 * The admin override of a partner's monthly Pod Request limit, as the venue
 * and host editors hold it: TEXT in the form (so an empty box means "no
 * override" rather than 0), turned into the mutation's `Int | null` on save.
 *
 * Both directions read the one rule in `@duncit/forms/schemas` — '' clears,
 * else a whole number 0–1000 — so the editors cannot drift from it.
 */

/** The form field: a string the shared override rule accepts. */
export function podRequestOverrideField(t: Translate) {
  const rule = makePodRequestOverrideSchema(t);
  return z
    .string()
    .refine((limit) => rule.safeParse({ limit }).success, t('podRequests.overrideInvalid'));
}

/** What the setVenueHostRequestLimit / setHostVenueRequestLimit mutation takes. */
export function podRequestOverrideInput(t: Translate, text: string): number | null {
  return makePodRequestOverrideSchema(t).parse({ limit: text }).limit;
}

/** The stored override as the form shows it — empty when none is set. */
export const podRequestOverrideText = (limit: number | null | undefined): string =>
  typeof limit === 'number' ? String(limit) : '';
