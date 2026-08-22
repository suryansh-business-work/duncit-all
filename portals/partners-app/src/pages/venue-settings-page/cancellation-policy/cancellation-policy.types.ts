import { z } from 'zod';
import type { VenueCancellationPolicy } from '../queries';

/**
 * The venue's cancellation policy as the form edits it.
 *
 * `hours_before` and `value` are held as strings because they come out of text
 * inputs — an emptied number field yields `''`, and coercing that to 0 would
 * silently save a band the owner was still typing.
 */
export interface CancellationTierValues {
  hours_before: string;
  charge_type: 'PERCENT' | 'AMOUNT';
  value: string;
}

export interface CancellationPolicyValues {
  reschedule_only: boolean;
  tiers: CancellationTierValues[];
}

/** A percent can never exceed the booking; a flat charge has no such ceiling. */
const PERCENT_MAX = 100;

export const cancellationPolicySchema = z
  .object({
    reschedule_only: z.boolean(),
    tiers: z.array(
      z.object({
        hours_before: z.coerce
          .number({ message: 'Enter the hours before the slot' })
          .int('Use whole hours')
          .min(0, 'Hours cannot be negative')
          .max(8760, 'Use 8760 hours (a year) or less'),
        charge_type: z.enum(['PERCENT', 'AMOUNT']),
        value: z.coerce
          .number({ message: 'Enter the charge' })
          .min(0, 'The charge cannot be negative'),
      })
    ),
  })
  .superRefine((values, ctx) => {
    // Two bands with the same window cannot both apply, and the server rejects
    // the pair — say so on the row rather than after a round trip.
    const seen = new Map<number, number>();
    values.tiers.forEach((tier, index) => {
      if (tier.charge_type === 'PERCENT' && tier.value > PERCENT_MAX) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tiers', index, 'value'],
          message: 'A percentage cannot go above 100',
        });
      }
      const first = seen.get(tier.hours_before);
      if (first === undefined) {
        seen.set(tier.hours_before, index);
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tiers', index, 'hours_before'],
          message: 'Another band already covers this window',
        });
      }
    });
  });

export const emptyTier: CancellationTierValues = {
  hours_before: '24',
  charge_type: 'PERCENT',
  value: '50',
};

/** Server policy → form values. */
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

/** Form values → `VenueSettingsInput.cancellation`. */
export function toPolicyInput(values: CancellationPolicyValues) {
  const cast = cancellationPolicySchema.parse(values);
  // The bands are saved even while `reschedule_only` is on: that switch makes
  // them inapplicable, not wrong, so turning it back off restores the policy
  // the owner already wrote instead of an empty list.
  return { reschedule_only: cast.reschedule_only, tiers: cast.tiers };
}
