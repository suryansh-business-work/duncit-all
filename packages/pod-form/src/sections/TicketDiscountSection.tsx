import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { TicketDiscountField, type TicketDiscountFieldErrors } from '@duncit/ui';
import {
  podFormTicketDiscountLabels,
  ticketDiscountMaxTickets,
  type TicketDiscountTier,
} from '@duncit/utils';
import { usePodFormData } from '../context';
import { formatTicketPrice } from '../ticket-discount';
import { useTicketDiscountMaxPct } from '../useTicketDiscountMaxPct';
import { useTranslation } from '../i18n/useTranslation';
import type { PodFormValues } from '../types';

interface MessageNode {
  message?: string;
}

/** What RHF holds under `ticket_discount_tiers` once the resolver has run. */
interface TierErrorNode extends MessageNode {
  root?: MessageNode;
  [index: number]: { min_tickets?: MessageNode; discount_pct?: MessageNode } | undefined;
}

/**
 * The resolver's messages in the field's shape: a list-level issue sits on the
 * array itself (or its `root`), a cell issue on `[row][column]`.
 */
function fieldErrors(error: unknown, rowCount: number): TicketDiscountFieldErrors {
  if (!error) return {};
  const node = error as TierErrorNode;
  return {
    list: node.message ?? node.root?.message,
    rows: Array.from({ length: rowCount }, (_, row) => ({
      min_tickets: node[row]?.min_tickets?.message,
      discount_pct: node[row]?.discount_pct?.message,
    })),
  };
}

/**
 * Multi-ticket discount for a priced pod: the shared `@duncit/ui` field bound
 * to the form. PodSections only mounts it while the pod has a ticket price, so
 * a free pod never shows it; CascadeEffect clears the values on a switch to FREE.
 */
export default function TicketDiscountSection() {
  const { t } = useTranslation();
  const { finance } = usePodFormData();
  const maxPct = useTicketDiscountMaxPct();
  const { control, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const enabled = useWatch({ control, name: 'ticket_discount_enabled' });
  const tiers = useWatch({ control, name: 'ticket_discount_tiers' });
  const podAmount = useWatch({ control, name: 'pod_amount' });
  const noOfSpots = useWatch({ control, name: 'no_of_spots' });
  const labels = useMemo(() => podFormTicketDiscountLabels(t), [t]);
  const formatPrice = (amount: number) => formatTicketPrice(amount, finance?.currency_symbol);
  const update = { shouldDirty: true, shouldValidate: true };

  return (
    <TicketDiscountField
      enabled={enabled}
      tiers={tiers}
      onEnabledChange={(next: boolean) => setValue('ticket_discount_enabled', next, update)}
      onTiersChange={(next: TicketDiscountTier[]) => setValue('ticket_discount_tiers', next, update)}
      maxPct={maxPct}
      maxTickets={ticketDiscountMaxTickets(Number(noOfSpots) || 0)}
      labels={labels}
      unitPrice={Number(podAmount) || 0}
      formatPrice={formatPrice}
      errors={fieldErrors(errors.ticket_discount_tiers, tiers.length)}
    />
  );
}
