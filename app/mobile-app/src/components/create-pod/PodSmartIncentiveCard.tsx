import { SurfaceCard } from '@/components/SurfaceCard';
import type { CreatePodForm } from './create-pod.types';
import { SmartIncentiveField } from './SmartIncentiveField';
import { useSmartIncentiveField } from './useSmartIncentiveField';

/**
 * Step 4's Smart Incentive card — the stepper's values wired into the shared
 * field. PricingStep only mounts it for a PAID pod (a FREE pod never carries
 * the incentive), and it renders nothing while Loyalty has the programme
 * switched off. mWeb twin: the create stepper's PricingStep card.
 */
export function PodSmartIncentiveCard({
  form,
  currency,
}: Readonly<{ form: CreatePodForm; currency: string }>) {
  const { watch, setValue, formState } = form;
  const field = useSmartIncentiveField({
    enabled: watch('smart_incentive_enabled'),
    pct: watch('smart_incentive_pct'),
    unitPrice: Number(watch('pod_amount_text')) || 0,
    currency,
    error: formState.errors.smart_incentive_pct?.message,
    onEnabledChange: (next) => setValue('smart_incentive_enabled', next, { shouldDirty: true }),
    onPctChange: (next) =>
      setValue('smart_incentive_pct', next, { shouldDirty: true, shouldValidate: true }),
  });
  if (!field) return null;
  return (
    <SurfaceCard testID="pricing-step-smart-incentive-card">
      <SmartIncentiveField {...field} />
    </SurfaceCard>
  );
}
