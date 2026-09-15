import { z } from 'zod';
import {
  DEFAULT_TICKET_DISCOUNT_MAX_PCT,
  TICKET_DISCOUNT_MAX_TIERS,
  mwebTicketDiscountLabels,
  ticketDiscountMaxTickets,
  ticketDiscountTierIssues,
  type TicketDiscountTier,
} from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';
import { useAppSettingsStore } from '@/stores/app-settings.store';
import type { TicketDiscountFieldErrors } from './TicketDiscountField';

/**
 * The multi-ticket discount's form wiring, shared by the Create / Club Admin
 * stepper and the host's Edit Pod sheet so both validate one way (rule 40).
 * The rules themselves live in @duncit/utils; this only feeds them the admin's
 * limit and turns their issue codes into Zod issues and field messages.
 */

/** The two form values every editor holds. */
export interface TicketDiscountValues {
  ticket_discount_enabled: boolean;
  ticket_discount_tiers: TicketDiscountTier[];
}

export const blankTicketDiscountValues: TicketDiscountValues = {
  ticket_discount_enabled: false,
  ticket_discount_tiers: [],
};

/** Zod shape of the two values; the tier rules run in `refineTicketDiscount`. */
export const ticketDiscountSchemaShape = {
  ticket_discount_enabled: z.boolean(),
  ticket_discount_tiers: z.array(z.object({ min_tickets: z.number(), discount_pct: z.number() })),
};

/**
 * The admin's `ticket_discount_max_pct`, read off the settings store at the
 * moment it is needed — the schema is built outside React, the same way
 * `parseDateTimeText` reads the admin's date pattern. The default only stands
 * in while settings are still loading.
 */
export function ticketDiscountMaxPct(): number {
  return (
    useAppSettingsStore.getState().data?.publicAppSettings?.ticket_discount_max_pct ??
    DEFAULT_TICKET_DISCOUNT_MAX_PCT
  );
}

/** Adds one Zod issue per tier problem — skipped entirely for a free pod, which never carries a discount. */
export function refineTicketDiscount(
  input: Readonly<TicketDiscountValues & { noOfSpots: number; free: boolean }>,
  ctx: z.RefinementCtx,
  t: Translate,
): void {
  if (input.free) return;
  const maxPct = ticketDiscountMaxPct();
  const maxTickets = ticketDiscountMaxTickets(input.noOfSpots);
  const limits = { maxPct, maxTickets, maxTiers: TICKET_DISCOUNT_MAX_TIERS };
  const labels = mwebTicketDiscountLabels(t);
  const issues = ticketDiscountTierIssues({
    enabled: input.ticket_discount_enabled,
    tiers: input.ticket_discount_tiers,
    maxPct,
    maxTickets,
  });
  for (const issue of issues) {
    ctx.addIssue({
      code: 'custom',
      path:
        issue.index === null
          ? ['ticket_discount_tiers']
          : ['ticket_discount_tiers', issue.index, issue.field],
      message: labels.errors[issue.code](limits),
    });
  }
}

type MessageHolder = { message?: string } | undefined;

/**
 * react-hook-form's error for `ticket_discount_tiers` as the field's `errors`
 * prop. The resolver nests it: a list-level message on the value itself, and
 * per-row messages under the row index — both can be present at once.
 */
export function ticketDiscountFieldErrors(
  error: unknown,
  rowCount: number,
): TicketDiscountFieldErrors {
  const source = (error ?? {}) as Record<number, Record<string, MessageHolder> | undefined> & {
    message?: string;
  };
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const row = source[index];
    if (!row) return undefined;
    return { min_tickets: row.min_tickets?.message, discount_pct: row.discount_pct?.message };
  });
  return { list: source.message, rows };
}

/**
 * A stored draft's discount values, made safe to put back in the form: a
 * payload from before the feature (or a hand-edited one) may hold anything.
 */
export function hydrateTicketDiscount(
  values: Readonly<{ ticket_discount_enabled?: unknown; ticket_discount_tiers?: unknown }>,
): TicketDiscountValues {
  const stored: unknown = values.ticket_discount_tiers;
  const tiers: readonly (Partial<TicketDiscountTier> | null)[] = Array.isArray(stored)
    ? stored
    : [];
  return {
    ticket_discount_enabled: values.ticket_discount_enabled === true,
    ticket_discount_tiers: tiers.map((tier) => ({
      min_tickets: Number(tier?.min_tickets) || 0,
      discount_pct: Number(tier?.discount_pct) || 0,
    })),
  };
}
