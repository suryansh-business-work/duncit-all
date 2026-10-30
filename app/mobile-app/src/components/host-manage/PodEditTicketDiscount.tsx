import { TicketDiscountField } from '@/components/create-pod/TicketDiscountField';
import { useTicketDiscountField } from '@/components/create-pod/useTicketDiscountField';
import type { PodEditForm } from './usePodEditForm';

/**
 * The multi-ticket discount inside the host's Edit Pod sheet. The sheet only
 * mounts it for a paid pod; the price itself is not editable here, so the
 * per-ticket captions price off the pod as published. mWeb twin: the field in
 * @duncit/host-pod-actions PodEditDialog (rule 27).
 */
export function PodEditTicketDiscount({
  form,
  unitPrice,
  currency,
}: Readonly<{ form: PodEditForm; unitPrice: number; currency: string }>) {
  const { watch, setValue, formState } = form;
  const field = useTicketDiscountField({
    enabled: watch('ticket_discount_enabled'),
    tiers: watch('ticket_discount_tiers'),
    noOfSpots: Number.parseInt(watch('no_of_spots_text'), 10) || 0,
    unitPrice,
    currency,
    error: formState.errors.ticket_discount_tiers,
    onEnabledChange: (next) => setValue('ticket_discount_enabled', next, { shouldDirty: true }),
    onTiersChange: (next) =>
      setValue('ticket_discount_tiers', next, { shouldDirty: true, shouldValidate: true }),
  });
  return <TicketDiscountField {...field} />;
}
