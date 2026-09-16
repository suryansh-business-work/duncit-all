import { useMemo } from 'react';
import {
  mwebTicketDiscountLabels,
  ticketDiscountMaxTickets,
  type TicketDiscountTier,
} from '@duncit/utils';

import { useAppSettings } from '@/hooks/useAppSettings';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import { ticketDiscountFieldErrors } from './ticket-discount.form';
import type { TicketDiscountFieldProps } from './TicketDiscountField';

export type TicketDiscountFieldSource = Readonly<{
  enabled: boolean;
  tiers: readonly TicketDiscountTier[];
  /** The pod's spots as the form holds them — sets the most tickets a tier may ask for. */
  noOfSpots: number;
  /** One ticket's price, for the per-ticket caption under each tier (0 hides it). */
  unitPrice: number;
  /** The admin's currency symbol (public finance settings). */
  currency: string;
  /** react-hook-form's error for `ticket_discount_tiers`, unshaped. */
  error: unknown;
  onEnabledChange: (enabled: boolean) => void;
  onTiersChange: (tiers: TicketDiscountTier[]) => void;
}>;

/**
 * Everything `TicketDiscountField` needs that is not the form's own values: the
 * admin's max %, the ticket ceiling, the translated labels, the price caption
 * and the resolver's messages. Shared by the Create / Club Admin stepper and
 * the host's Edit Pod sheet, so the two surfaces render the field one way.
 */
export function useTicketDiscountField(
  source: TicketDiscountFieldSource,
): TicketDiscountFieldProps {
  const { t } = useTranslation();
  const { ticketDiscountMaxPct } = useAppSettings();
  const labels = useMemo(() => mwebTicketDiscountLabels(t), [t]);
  const hasPrice = source.unitPrice > 0;
  return {
    enabled: source.enabled,
    tiers: source.tiers,
    onEnabledChange: source.onEnabledChange,
    onTiersChange: source.onTiersChange,
    maxPct: ticketDiscountMaxPct,
    maxTickets: ticketDiscountMaxTickets(source.noOfSpots),
    labels,
    unitPrice: hasPrice ? source.unitPrice : undefined,
    formatPrice: (amount) => formatMoney(source.currency, amount),
    errors: ticketDiscountFieldErrors(source.error, source.tiers.length),
  };
}
