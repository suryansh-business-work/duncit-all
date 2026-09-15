import type { z } from 'zod';
import type { FieldError } from 'react-hook-form';
import type { TicketDiscountFieldErrors } from '@duncit/ui';
import {
  TICKET_DISCOUNT_MAX_TIERS,
  ticketDiscountInput,
  ticketDiscountMaxTickets,
  ticketDiscountTierIssues,
  type TicketDiscountLabels,
  type TicketDiscountTier,
} from '@duncit/utils';
import type { HostPodTarget } from './types';

/**
 * The multi-ticket discount inside the host's Edit Pod sheet.
 *
 * The tier RULES live once in `@duncit/utils` (and in the server's twin); this
 * file only adapts them to the edit dialog: what the pod already stores, whether
 * it can carry a discount at all, and when an edit needs re-validating.
 */

/** The two form values the discount editor writes. */
export interface PodEditTicketDiscountValues {
  ticket_discount_enabled: boolean;
  ticket_discount_tiers: TicketDiscountTier[];
}

/** What the dialog knows about the pod's discount, or null when it cannot edit one. */
export interface PodEditTicketDiscount {
  /** FREE type or a 0 price — the section is hidden and the input clears it. */
  free: boolean;
  /** `publicAppSettings.ticket_discount_max_pct`. */
  maxPct: number;
  /** The discount as the pod stores it today. */
  stored: PodEditTicketDiscountValues;
}

/** A free pod never carries a discount: a FREE type, or no ticket price at all. */
export function isFreePodPrice(pod: Readonly<Pick<HostPodTarget, 'pod_type' | 'pod_amount'>>): boolean {
  return String(pod.pod_type ?? '').includes('FREE') || (Number(pod.pod_amount) || 0) <= 0;
}

/**
 * The pod's stored discount as form values. Each tier is copied field by field,
 * which also drops Apollo's `__typename` — sent back inside an input, it would
 * fail the mutation's validation.
 */
export function podTicketDiscountValues(pod: HostPodTarget | null): PodEditTicketDiscountValues {
  return {
    ticket_discount_enabled: pod?.ticket_discount_enabled === true,
    ticket_discount_tiers: (pod?.ticket_discount_tiers ?? []).map((tier) => ({
      min_tickets: tier.min_tickets,
      discount_pct: tier.discount_pct,
    })),
  };
}

/**
 * The dialog's discount context. Null when the list that opened the dialog did
 * not select the pod's tiers — without them the form would start "off" and a
 * save would switch the host's real discount off with it.
 */
export function podEditTicketDiscount(
  pod: HostPodTarget | null,
  maxPct: number,
): PodEditTicketDiscount | null {
  if (!pod || !Array.isArray(pod.ticket_discount_tiers)) return null;
  return { free: isFreePodPrice(pod), maxPct, stored: podTicketDiscountValues(pod) };
}

/** True when the edit leaves the discount exactly as the pod stores it. */
function sameTicketDiscount(
  values: PodEditTicketDiscountValues,
  stored: PodEditTicketDiscountValues,
): boolean {
  if (values.ticket_discount_enabled !== stored.ticket_discount_enabled) return false;
  const next = values.ticket_discount_tiers;
  const before = stored.ticket_discount_tiers;
  return (
    next.length === before.length &&
    next.every(
      (tier, index) =>
        tier.min_tickets === before[index].min_tickets &&
        tier.discount_pct === before[index].discount_pct,
    )
  );
}

/**
 * Zod superRefine step for the discount (SPEC §4).
 *
 * An UNTOUCHED discount is not re-checked, exactly as the server does not
 * re-check it: an admin lowering the global max % must not stop a host fixing a
 * typo in their title. Touch any tier and the whole ladder is validated.
 */
export function refinePodEditTicketDiscount(
  values: PodEditTicketDiscountValues & { no_of_spots: number },
  ctx: z.RefinementCtx,
  discount: PodEditTicketDiscount,
  labels: TicketDiscountLabels,
): void {
  if (discount.free || sameTicketDiscount(values, discount.stored)) return;
  const limits = {
    maxPct: discount.maxPct,
    maxTickets: ticketDiscountMaxTickets(values.no_of_spots),
    maxTiers: TICKET_DISCOUNT_MAX_TIERS,
  };
  const issues = ticketDiscountTierIssues({
    enabled: values.ticket_discount_enabled,
    tiers: values.ticket_discount_tiers,
    maxPct: limits.maxPct,
    maxTickets: limits.maxTickets,
  });
  for (const issue of issues) {
    const path =
      issue.index === null
        ? ['ticket_discount_tiers']
        : ['ticket_discount_tiers', issue.index, issue.field];
    ctx.addIssue({ code: 'custom', path, message: labels.errors[issue.code](limits) });
  }
}

/** The HostUpdatePodInput fields for the discount; nothing when the dialog could not edit it. */
export function podEditTicketDiscountInput(
  values: PodEditTicketDiscountValues,
  discount: PodEditTicketDiscount | null | undefined,
) {
  return discount ? ticketDiscountInput(values, discount.free) : {};
}

/** How RHF nests the resolver's messages under `ticket_discount_tiers`. */
interface TierErrorTree {
  message?: string;
  [row: number]:
    | { min_tickets?: { message?: string }; discount_pct?: { message?: string } }
    | undefined;
}

/** The field-state error of `ticket_discount_tiers`, as the shared field's `errors` prop. */
export function ticketDiscountFieldErrors(
  error: FieldError | undefined,
  count: number,
): TicketDiscountFieldErrors {
  const tree = error as TierErrorTree | undefined;
  return {
    list: tree?.message,
    rows: Array.from({ length: count }, (_, index) => ({
      min_tickets: tree?.[index]?.min_tickets?.message,
      discount_pct: tree?.[index]?.discount_pct?.message,
    })),
  };
}
