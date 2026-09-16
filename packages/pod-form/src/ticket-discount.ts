import { z } from 'zod';
import {
  TICKET_DISCOUNT_MAX_TIERS,
  formatMoney,
  podFormTicketDiscountLabels,
  ticketDiscountMaxTickets,
  ticketDiscountTierIssues,
} from '@duncit/utils';
import type { Translate } from './i18n/useTranslation';
import type { PodFormValues } from './types';

/**
 * The multi-ticket discount as the portal pod form holds it. The tier rules
 * themselves live once in `@duncit/utils` (pod-ticket-discount.ts); this file
 * only wires them into this form's Zod schema and gates.
 */

/**
 * Whether the pod sells a ticket a discount could come off: not a FREE type,
 * and a price above zero. Anything else never carries tiers — the section
 * hides, the schema skips the tier rules and the input sends them cleared.
 */
export function podHasTicketPrice(values: Pick<PodFormValues, 'pod_type' | 'pod_amount'>): boolean {
  return !values.pod_type.includes('FREE') && Number(values.pod_amount) > 0;
}

/**
 * A discounted ticket price. It can land on paise (₹499 at 10% off is
 * ₹449.10), which the whole-rupee default would round away.
 */
export function formatTicketPrice(amount: number, symbol?: string): string {
  return formatMoney(amount, { symbol, decimals: Number.isInteger(amount) ? 0 : 2 });
}

/** One stored tier. Bounds and ordering are `refineTicketDiscount`'s, so each
 * problem gets its own translated message instead of a generic Zod one. */
export const ticketDiscountTierSchema = z.object({
  min_tickets: z.number(),
  discount_pct: z.number(),
});

/**
 * Tier rules for a priced pod: `ticketDiscountTierIssues` reports every
 * problem, and each lands on the row cell (or the list) it belongs to.
 * `maxPct` is the admin's `publicAppSettings.ticket_discount_max_pct`.
 */
export function refineTicketDiscount(
  values: PodFormValues,
  ctx: z.RefinementCtx,
  t: Translate,
  maxPct: number,
) {
  if (!podHasTicketPrice(values)) return;
  const maxTickets = ticketDiscountMaxTickets(Number(values.no_of_spots) || 0);
  const issues = ticketDiscountTierIssues({
    enabled: values.ticket_discount_enabled,
    tiers: values.ticket_discount_tiers,
    maxPct,
    maxTickets,
  });
  if (issues.length === 0) return;
  const labels = podFormTicketDiscountLabels(t);
  const limits = { maxPct, maxTickets, maxTiers: TICKET_DISCOUNT_MAX_TIERS };
  for (const issue of issues) {
    const path = issue.index === null
      ? ['ticket_discount_tiers']
      : ['ticket_discount_tiers', issue.index, issue.field];
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: labels.errors[issue.code](limits) });
  }
}
