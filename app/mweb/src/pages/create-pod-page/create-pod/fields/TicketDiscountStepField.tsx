import { useMemo } from 'react';
import { useController } from 'react-hook-form';
import { Box } from '@mui/material';
import { TicketDiscountField, type TicketDiscountFieldErrors } from '@duncit/ui';
import {
  mwebTicketDiscountLabels,
  ticketDiscountMaxTickets,
  type TicketDiscountTier,
} from '@duncit/utils';
import { usePricing } from '../../../../hooks/usePricing';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import { useTicketDiscountMaxPct } from '../../../../utils/dateFormat';
import type { CreatePodForm } from '../create-pod.types';

/** One message slot on an RHF error node, whatever else the node carries. */
type ErrorNode = { message?: string } | undefined;

/**
 * The tier list's RHF error as the field's messages. A list-level issue sits on
 * the node itself (or its `root`); a row's issues sit under the row's index.
 */
function toFieldErrors(error: unknown, count: number): TicketDiscountFieldErrors | undefined {
  if (!error) return undefined;
  const node = error as Record<string, unknown> & { message?: string; root?: ErrorNode };
  const rowAt = (index: number) =>
    node[String(index)] as Record<'min_tickets' | 'discount_pct', ErrorNode> | undefined;
  return {
    list: node.message ?? node.root?.message,
    rows: Array.from({ length: count }, (_, index) => ({
      min_tickets: rowAt(index)?.min_tickets?.message,
      discount_pct: rowAt(index)?.discount_pct?.message,
    })),
  };
}

/**
 * Step 4's multi-ticket discount card: the shared `@duncit/ui` editor bound to
 * the stepper's form. PricingStep hides it for a FREE pod, and PodTypeCards
 * clears both values when the host switches to FREE. Native twin:
 * `components/create-pod/TicketDiscountField` (rule 27).
 */
export default function TicketDiscountStepField({ form }: Readonly<{ form: CreatePodForm }>) {
  const { t } = useTranslation();
  const { format } = usePricing();
  const maxPct = useTicketDiscountMaxPct();
  const labels = useMemo(() => mwebTicketDiscountLabels(t), [t]);
  const enabled = useController({ control: form.control, name: 'ticket_discount_enabled' });
  const tiers = useController({ control: form.control, name: 'ticket_discount_tiers' });
  const unitPrice = Number(form.watch('pod_amount')) || 0;
  const maxTickets = ticketDiscountMaxTickets(Number(form.watch('no_of_spots')) || 0);

  const changeTiers = (next: TicketDiscountTier[]) => {
    tiers.field.onChange(next);
    // An error Next put on screen follows the host's edits instead of going
    // stale: a blur marks the list touched, so it re-validates from here on.
    if (tiers.fieldState.error) tiers.field.onBlur();
  };

  return (
    <Box data-testid="pricing-step-ticket-discount-card" sx={{ ...SURFACE_SX, p: 2 }}>
      <TicketDiscountField
        enabled={enabled.field.value}
        tiers={tiers.field.value}
        onEnabledChange={enabled.field.onChange}
        onTiersChange={changeTiers}
        maxPct={maxPct}
        maxTickets={maxTickets}
        labels={labels}
        unitPrice={unitPrice > 0 ? unitPrice : undefined}
        formatPrice={format}
        errors={toFieldErrors(tiers.fieldState.error, tiers.field.value.length)}
      />
    </Box>
  );
}
