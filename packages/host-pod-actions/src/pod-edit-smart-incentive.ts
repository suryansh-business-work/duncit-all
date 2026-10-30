import type { z } from 'zod';
import {
  smartIncentiveFormValues,
  smartIncentiveInput,
  smartIncentivePctIssue,
  type SmartIncentiveLabels,
  type SmartIncentiveValues,
} from '@duncit/utils';
import { isFreePodPrice } from './pod-edit-ticket-discount';
import type { HostPodTarget } from './types';

/**
 * The Smart Incentive inside the host's Edit Pod sheet.
 *
 * The percentage RULE lives once in `@duncit/utils` (and in the server's twin);
 * this file only adapts it to the edit dialog, the way
 * pod-edit-ticket-discount.ts does for the multi-ticket discount: what the pod
 * already stores, whether it can carry an offer at all, and when an edit needs
 * re-validating.
 */

/** Loyalty > Smart Incentive's settings, as the editor reads them. */
export interface SmartIncentiveProgramme {
  /** The programme's switch. Off, the editor is not offered at all. */
  enabled: boolean;
  /** The biggest discount a host may choose (`max_discount_pct`). */
  maxPct: number;
  /** Seconds on the pod page before the offer shows — quoted in the explainer. */
  delaySeconds: number;
}

/** What the dialog knows about the pod's Smart Incentive, or null when it cannot edit it. */
export interface PodEditSmartIncentive {
  /** FREE type or a 0 price — the editor is hidden and the input switches the offer off. */
  free: boolean;
  programme: SmartIncentiveProgramme;
  /** The offer as the pod stores it today, the way the form holds it. */
  stored: SmartIncentiveValues;
}

/**
 * The dialog's Smart Incentive context. Null when the list that opened the
 * dialog did not select the pod's offer — without it the form would start
 * "off" and a save would switch the host's real offer off with it.
 */
export function podEditSmartIncentive(
  pod: HostPodTarget | null,
  programme: SmartIncentiveProgramme,
): PodEditSmartIncentive | null {
  if (!pod || typeof pod.smart_incentive_enabled !== 'boolean') return null;
  return { free: isFreePodPrice(pod), programme, stored: smartIncentiveFormValues(pod) };
}

/** True when the edit keeps the offer on at the percentage the pod stores — the server's own test. */
function sameSmartIncentive(values: SmartIncentiveValues, stored: SmartIncentiveValues): boolean {
  return (
    stored.smart_incentive_enabled &&
    Number(values.smart_incentive_pct) === Number(stored.smart_incentive_pct)
  );
}

/**
 * Zod superRefine step for the offer.
 *
 * Checked only while the switch is on — a switched-off offer stores nothing.
 * An UNTOUCHED offer is not re-checked, exactly as the server does not re-check
 * it: Loyalty lowering its maximum must not stop a host fixing a typo in their
 * title. Change the percentage, or switch the offer on, and it is checked
 * against the programme's current maximum.
 */
export function refinePodEditSmartIncentive(
  values: SmartIncentiveValues,
  ctx: z.RefinementCtx,
  incentive: PodEditSmartIncentive,
  labels: SmartIncentiveLabels,
): void {
  if (incentive.free || !values.smart_incentive_enabled || sameSmartIncentive(values, incentive.stored)) return;
  const { maxPct } = incentive.programme;
  const issue = smartIncentivePctIssue(values.smart_incentive_pct, maxPct);
  if (issue) {
    ctx.addIssue({ code: 'custom', path: ['smart_incentive_pct'], message: labels.errors[issue](maxPct) });
  }
}

/** The HostUpdatePodInput fields for the offer; nothing when the dialog could not edit it. */
export function podEditSmartIncentiveInput(
  values: SmartIncentiveValues,
  incentive: PodEditSmartIncentive | null | undefined,
) {
  return incentive ? smartIncentiveInput(values, incentive.free) : {};
}
