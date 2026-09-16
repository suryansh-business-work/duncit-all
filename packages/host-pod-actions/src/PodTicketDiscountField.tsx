import { useController, useWatch, type Control } from 'react-hook-form';
import { TicketDiscountField } from '@duncit/ui';
import { formatMoney, ticketDiscountMaxTickets, type TicketDiscountLabels } from '@duncit/utils';
import { ticketDiscountFieldErrors, type PodEditTicketDiscount } from './pod-edit-ticket-discount';
import type { PodEditFormInput, PodEditValues } from './pod-edit.form';

interface Props {
  control: Control<PodEditFormInput, any, PodEditValues>;
  discount: PodEditTicketDiscount;
  labels: TicketDiscountLabels;
  /** The pod's ticket price — each tier then shows what one ticket costs. */
  unitPrice: number;
}

/** Tier prices to the paisa: a 10% tier on ₹499 is ₹449.10, not ₹449. */
const formatTierPrice = (amount: number) => formatMoney(amount, { decimals: 2 });

/**
 * The multi-ticket discount, inside the host's Edit Pod sheet.
 *
 * Only the wiring lives here — the editor is `@duncit/ui`'s shared
 * `TicketDiscountField`, the one the create stepper and the portal pod form
 * render too (rule 40). The most tickets a tier may ask for follows the
 * capacity control above it, so raising the pod's spots opens bigger tiers in
 * the same edit.
 *
 * Hoisted to module scope rather than nested in the dialog (S6478).
 */
export default function PodTicketDiscountField({
  control,
  discount,
  labels,
  unitPrice,
}: Readonly<Props>) {
  const enabled = useController({ control, name: 'ticket_discount_enabled' });
  const tiers = useController({ control, name: 'ticket_discount_tiers' });
  const spots = useWatch({ control, name: 'no_of_spots' });

  return (
    <TicketDiscountField
      enabled={enabled.field.value}
      tiers={tiers.field.value}
      onEnabledChange={enabled.field.onChange}
      onTiersChange={tiers.field.onChange}
      maxPct={discount.maxPct}
      maxTickets={ticketDiscountMaxTickets(Number(spots))}
      labels={labels}
      unitPrice={unitPrice}
      formatPrice={formatTierPrice}
      errors={ticketDiscountFieldErrors(tiers.fieldState.error, tiers.field.value.length)}
    />
  );
}
