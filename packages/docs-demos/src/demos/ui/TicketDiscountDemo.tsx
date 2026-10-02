import { useEffect, useState } from 'react';
import { TicketDiscountField, type TicketDiscountFieldErrors } from '@duncit/ui';
import { POD_FORM_BUNDLE, createTranslator, flattenCatalogue } from '@duncit/i18n';
import {
  TICKET_DISCOUNT_MAX_TIERS,
  formatMoney,
  podFormTicketDiscountLabels,
  ticketDiscountMaxTickets,
  ticketDiscountTierIssues,
  type TicketDiscountIssue,
  type TicketDiscountLimits,
  type TicketDiscountTier,
} from '@duncit/utils';

export interface TicketDiscountMock {
  pod_id: string;
  pod_amount: number;
  no_of_spots: number;
  /** `publicAppSettings.ticket_discount_max_pct`. */
  ticket_discount_max_pct: number;
  ticket_discount_enabled: boolean;
  ticket_discount_tiers: TicketDiscountTier[];
}

/** The portal pod form's own English for `podForm.ticketDiscount.*`, resolved the way the form does. */
const { t: podFormT } = createTranslator({ locale: 'en-IN', fallback: flattenCatalogue(POD_FORM_BUNDLE) });
const TICKET_DISCOUNT_LABELS = podFormTicketDiscountLabels(podFormT);

const formatPaise = (amount: number) => formatMoney(amount, { decimals: 2 });

/**
 * What a surface's Zod superRefine does with the shared issue list: one
 * translated message per path, the first issue on a field winning.
 */
function toFieldErrors(
  issues: readonly TicketDiscountIssue[],
  limits: TicketDiscountLimits,
): TicketDiscountFieldErrors {
  const rows: Array<{ min_tickets?: string; discount_pct?: string }> = [];
  let list: string | undefined;
  for (const issue of issues) {
    const message = TICKET_DISCOUNT_LABELS.errors[issue.code](limits);
    if (issue.index === null) {
      list ??= message;
    } else {
      rows[issue.index] = { [issue.field]: message, ...rows[issue.index] };
    }
  }
  return { list, rows };
}

/** Holds the ladder the way a form would — hoisted for the same reason as `SpotsDemo`. */
export function TicketDiscountDemo({ mock }: Readonly<{ mock: TicketDiscountMock }>) {
  const [enabled, setEnabled] = useState(mock.ticket_discount_enabled);
  const [tiers, setTiers] = useState(mock.ticket_discount_tiers);
  useEffect(() => {
    setEnabled(mock.ticket_discount_enabled);
    setTiers(mock.ticket_discount_tiers);
  }, [mock.ticket_discount_enabled, mock.ticket_discount_tiers]);
  const limits: TicketDiscountLimits = {
    maxPct: mock.ticket_discount_max_pct,
    maxTickets: ticketDiscountMaxTickets(mock.no_of_spots),
    maxTiers: TICKET_DISCOUNT_MAX_TIERS,
  };
  const issues = ticketDiscountTierIssues({
    enabled,
    tiers,
    maxPct: limits.maxPct,
    maxTickets: limits.maxTickets,
  });
  return (
    <TicketDiscountField
      enabled={enabled}
      tiers={tiers}
      onEnabledChange={setEnabled}
      onTiersChange={setTiers}
      maxPct={limits.maxPct}
      maxTickets={limits.maxTickets}
      labels={TICKET_DISCOUNT_LABELS}
      unitPrice={mock.pod_amount}
      formatPrice={formatPaise}
      errors={toFieldErrors(issues, limits)}
    />
  );
}
