import type { UseFormReturn } from 'react-hook-form';

import { TicketDiscountField } from '@/components/create-pod/TicketDiscountField';
import { useTicketDiscountField } from '@/components/create-pod/useTicketDiscountField';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import type { PodEditValues } from './pod-edit.form';

/**
 * The multi-ticket discount inside the host's Edit Pod sheet. The sheet only
 * mounts it for a paid pod; the price itself is not editable here, so the
 * per-ticket captions price off the pod as published. mWeb twin: the field in
 * @duncit/host-pod-actions PodEditDialog (rule 27).
 */
export function PodEditTicketDiscount({
  form,
  unitPrice,
}: Readonly<{ form: UseFormReturn<PodEditValues, any, PodEditValues>; unitPrice: number }>) {
  const { watch, setValue, formState } = form;
  const { currency } = usePublicFinance();
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
