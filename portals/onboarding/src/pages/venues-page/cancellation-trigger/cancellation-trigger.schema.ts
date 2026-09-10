import { z } from 'zod';

import type {
  CancellationTriggerValues,
  RefundTierValues,
  VenueCancellationTrigger,
} from './cancellation-trigger.types';

/** The window every venue carries until this review gives it its own. */
export const DEFAULT_TRIGGER_HOURS = 6;

/** The widest window a band may cover — a year of hours. */
const HOURS_MAX = 8760;

type Translate = (key: string) => string;

/**
 * The auto-cancel contract the review asks for on an onboarded venue: how close
 * to the start a loss-making pod here may still be cancelled, and the ladder
 * that decides what its attendees get back.
 *
 * Two bands with the same window cannot both apply and the server rejects the
 * pair — the schema says so on the row rather than after a round trip.
 *
 * @param t The reader's translator — every message is copy (rule 38), in the
 *   `onboarding.venues.validation.*` namespace this portal ships.
 */
export function makeCancellationTriggerSchema(t: Translate) {
  const hours = (requiredKey: string) =>
    z.coerce
      .number({ message: t(requiredKey) })
      .int(t('onboarding.venues.validation.wholeHours'))
      .min(0, t('onboarding.venues.validation.hoursNegative'))
      .max(HOURS_MAX, t('onboarding.venues.validation.hoursMax'));

  return z
    .object({
      trigger_hours: hours('onboarding.venues.validation.triggerRequired'),
      refund_tiers: z.array(
        z.object({
          hours_before: hours('onboarding.venues.validation.hoursRequired'),
          refund_pct: z.coerce
            .number({ message: t('onboarding.venues.validation.refundRequired') })
            .min(0, t('onboarding.venues.validation.refundNegative'))
            .max(100, t('onboarding.venues.validation.refundMax')),
        })
      ),
    })
    .superRefine((values, ctx) => {
      const seen = new Set<number>();
      values.refund_tiers.forEach((tier, index) => {
        if (seen.has(tier.hours_before)) {
          ctx.addIssue({
            code: 'custom',
            path: ['refund_tiers', index, 'hours_before'],
            message: t('onboarding.venues.validation.duplicateWindow'),
          });
        } else {
          seen.add(tier.hours_before);
        }
      });
    });
}

/** The band "Add refund band" appends — the widest rule of a common ladder. */
export const emptyRefundTier: RefundTierValues = { hours_before: '24', refund_pct: '100' };

/** Server policy → form values. A venue with no ladder yet edits an empty one. */
export function toTriggerValues(
  trigger?: Partial<VenueCancellationTrigger> | null
): CancellationTriggerValues {
  return {
    trigger_hours: String(trigger?.trigger_hours ?? DEFAULT_TRIGGER_HOURS),
    refund_tiers: (trigger?.refund_tiers ?? []).map((tier) => ({
      hours_before: String(tier.hours_before),
      refund_pct: String(tier.refund_pct),
    })),
  };
}
