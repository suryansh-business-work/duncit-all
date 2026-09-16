import { SurfaceCard } from '@/components/SurfaceCard';
import type { CreatePodForm } from './create-pod.types';
import { TicketDiscountField } from './TicketDiscountField';
import { useTicketDiscountField } from './useTicketDiscountField';

/**
 * Step 4's multi-ticket discount card — the stepper's values wired into the
 * shared field. PricingStep only mounts it for a PAID pod (a FREE pod never
 * carries a discount). mWeb twin: the create stepper's PricingStep card.
 */
export function PodTicketDiscountCard({
  form,
  currency,
}: Readonly<{ form: CreatePodForm; currency: string }>) {
  const { watch, setValue, formState } = form;
  const field = useTicketDiscountField({
    enabled: watch('ticket_discount_enabled'),
    tiers: watch('ticket_discount_tiers'),
    noOfSpots: Number(watch('no_of_spots_text')) || 0,
    unitPrice: Number(watch('pod_amount_text')) || 0,
    currency,
    error: formState.errors.ticket_discount_tiers,
    onEnabledChange: (next) => setValue('ticket_discount_enabled', next, { shouldDirty: true }),
    onTiersChange: (next) =>
      setValue('ticket_discount_tiers', next, { shouldDirty: true, shouldValidate: true }),
  });
  return (
    <SurfaceCard testID="pricing-step-ticket-discount-card">
      <TicketDiscountField {...field} />
    </SurfaceCard>
  );
}
