import {
  makeCancellationPolicySchema,
  toPolicyInput,
  type VenueCancellationPolicy,
} from '@duncit/forms/schemas';

import { VenueCancellationChargeType } from '@/generated/graphql/graphql';
import type { Translate } from '@/i18n/fallback';

export type {
  CancellationPolicyValues,
  CancellationTierValues,
  VenueCancellationPolicy,
} from '@duncit/forms/schemas';
export { emptyTier, toPolicyValues } from '@duncit/forms/schemas';

/**
 * The venue's cancellation policy contract — the shared one from
 * `@duncit/forms/schemas`, bound to this surface's translator, so mWeb, the
 * Partners console and this app refuse a band with the same sentence
 * (rules 27 + 40).
 */
export const makeVenueSettingsSchema = (t: Translate) => makeCancellationPolicySchema(t);

/** The policy as `myVenues` answers it. Codegen emits the charge type as a TS
 * enum while the shared schema holds the plain string, so the two are mapped
 * here at the boundary rather than cast. */
export interface ServerCancellationPolicy {
  reschedule_only: boolean;
  tiers: readonly {
    hours_before: number;
    charge_type: VenueCancellationChargeType;
    value: number;
  }[];
}

export function policyFromServer(
  policy: ServerCancellationPolicy | null | undefined,
): VenueCancellationPolicy | null {
  if (!policy) return null;
  return {
    reschedule_only: policy.reschedule_only,
    tiers: policy.tiers.map((tier) => ({
      hours_before: tier.hours_before,
      charge_type: tier.charge_type === VenueCancellationChargeType.Amount ? 'AMOUNT' : 'PERCENT',
      value: tier.value,
    })),
  };
}

/** Validated form values → `VenueSettingsInput.cancellation`. */
export function policyToInput(values: Parameters<typeof toPolicyInput>[0], t: Translate) {
  const policy = toPolicyInput(values, t);
  return {
    reschedule_only: policy.reschedule_only,
    tiers: policy.tiers.map((tier) => ({
      hours_before: tier.hours_before,
      charge_type:
        tier.charge_type === 'AMOUNT'
          ? VenueCancellationChargeType.Amount
          : VenueCancellationChargeType.Percent,
      value: tier.value,
    })),
  };
}
