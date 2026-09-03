import { z } from 'zod';

import type { Translate } from './translate';

/** How a cancellation charge is expressed — a share of the slot price, or rupees. */
export type VenueCancellationChargeType = 'PERCENT' | 'AMOUNT';

/**
 * One band of the policy as the server holds it: cancelling INSIDE
 * `hours_before` of the slot start costs `value`.
 */
export interface VenueCancellationTier {
  hours_before: number;
  charge_type: VenueCancellationChargeType;
  value: number;
}

/**
 * The venue's policy as `VenueSettings.cancellation` answers it, and as
 * `VenueSettingsInput.cancellation` takes it back — the two shapes are the same.
 */
export interface VenueCancellationPolicy {
  reschedule_only: boolean;
  tiers: VenueCancellationTier[];
}

/**
 * One band as the form edits it.
 *
 * `hours_before` and `value` are held as strings because they come out of text
 * inputs — an emptied number field yields `''`, and a form state that coerced
 * that to 0 on every keystroke would keep rewriting what the owner was typing.
 */
export interface CancellationTierValues {
  hours_before: string;
  charge_type: VenueCancellationChargeType;
  value: string;
}

export interface CancellationPolicyValues {
  reschedule_only: boolean;
  tiers: CancellationTierValues[];
}

/** A percent can never exceed the booking; a flat charge has no such ceiling. */
const PERCENT_MAX = 100;

/** The widest window a band may cover — a year of hours. */
const HOURS_MAX = 8760;

/**
 * The cancellation policy contract the Partners console, mWeb and the native
 * app all ask a venue owner for.
 *
 * Two bands with the same window cannot both apply, and the server rejects the
 * pair — the schema says so on the row rather than after a round trip. A
 * percent above 100 is refused for the same reason: it would charge more than
 * the booking.
 *
 * @param t The reader's translator — every message is copy (rule 38), in the
 *   `venueSettings.*` namespace all three surfaces ship.
 */
export function makeCancellationPolicySchema(t: Translate) {
  return z
    .object({
      reschedule_only: z.boolean(),
      tiers: z.array(
        z.object({
          hours_before: z.coerce
            .number({ message: t('venueSettings.validation.hoursRequired') })
            .int(t('venueSettings.validation.wholeHours'))
            .min(0, t('venueSettings.validation.hoursNegative'))
            .max(HOURS_MAX, t('venueSettings.validation.hoursMax')),
          charge_type: z.enum(['PERCENT', 'AMOUNT']),
          value: z.coerce
            .number({ message: t('venueSettings.validation.chargeRequired') })
            .min(0, t('venueSettings.validation.chargeNegative')),
        })
      ),
    })
    .superRefine((values, ctx) => {
      const seen = new Set<number>();
      values.tiers.forEach((tier, index) => {
        if (tier.charge_type === 'PERCENT' && tier.value > PERCENT_MAX) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['tiers', index, 'value'],
            message: t('venueSettings.validation.percentMax'),
          });
        }
        if (seen.has(tier.hours_before)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['tiers', index, 'hours_before'],
            message: t('venueSettings.validation.duplicateWindow'),
          });
        } else {
          seen.add(tier.hours_before);
        }
      });
    });
}

/** The band "Add a charge" appends — a common late-cancellation rule. */
export const emptyTier: CancellationTierValues = {
  hours_before: '24',
  charge_type: 'PERCENT',
  value: '50',
};

/** Server policy → form values. A venue with no policy yet edits an empty one. */
export function toPolicyValues(policy?: VenueCancellationPolicy | null): CancellationPolicyValues {
  return {
    reschedule_only: policy?.reschedule_only ?? false,
    tiers: (policy?.tiers ?? []).map((tier) => ({
      hours_before: String(tier.hours_before),
      charge_type: tier.charge_type,
      value: String(tier.value),
    })),
  };
}

/**
 * Form values → `VenueSettingsInput.cancellation`. Parses with the schema, so
 * an invalid policy throws rather than reaching the server.
 *
 * The bands are saved even while `reschedule_only` is on: that switch makes
 * them inapplicable, not wrong, so turning it back off restores the policy the
 * owner already wrote instead of an empty list.
 */
export function toPolicyInput(values: CancellationPolicyValues, t: Translate): VenueCancellationPolicy {
  const cast = makeCancellationPolicySchema(t).parse(values);
  return { reschedule_only: cast.reschedule_only, tiers: cast.tiers };
}
