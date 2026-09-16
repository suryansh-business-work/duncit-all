import type { z } from 'zod';
import {
  TICKET_DISCOUNT_MAX_TIERS,
  mwebTicketDiscountLabels,
  ticketDiscountMaxTickets,
  ticketDiscountTierIssues,
} from '@duncit/utils';
import type { Translate } from '../../../i18n/fallback';
import { isFreePodType, type CreatePodFormValues } from './create-pod.types';

/**
 * The multi-ticket discount rules of Step 4, as Zod issues.
 *
 * The rules themselves live in `@duncit/utils` (`ticketDiscountTierIssues`) so
 * the native stepper, the portal pod form and the server's twin agree on them;
 * this only places each issue on its row and words it in the reader's language.
 * A FREE pod is skipped — it never carries a discount, and the input builder
 * sends it cleared.
 */
export function refineTicketDiscount(
  values: CreatePodFormValues,
  ctx: z.RefinementCtx,
  t: Translate,
  maxPct: number,
) {
  if (isFreePodType(values.pod_type)) return;
  const maxTickets = ticketDiscountMaxTickets(Number(values.no_of_spots) || 0);
  const issues = ticketDiscountTierIssues({
    enabled: values.ticket_discount_enabled,
    tiers: values.ticket_discount_tiers,
    maxPct,
    maxTickets,
  });
  if (issues.length === 0) return;
  const labels = mwebTicketDiscountLabels(t);
  const limits = { maxPct, maxTickets, maxTiers: TICKET_DISCOUNT_MAX_TIERS };
  for (const issue of issues) {
    const path =
      issue.index === null
        ? ['ticket_discount_tiers']
        : ['ticket_discount_tiers', issue.index, issue.field];
    ctx.addIssue({ code: 'custom', path, message: labels.errors[issue.code](limits) });
  }
}
