import { SmartIncentiveField } from '@/components/create-pod/SmartIncentiveField';
import { useSmartIncentiveField } from '@/components/create-pod/useSmartIncentiveField';
import type { PodEditForm } from './usePodEditForm';

/**
 * The Smart Incentive inside the host's Edit Pod sheet. Mounted only for a
 * paid pod whose row says what it offers now, and empty while Loyalty has the
 * programme off — the same facts that decide whether the save sends it. The
 * price is not editable here, so the preview prices off the pod as published.
 * mWeb twin: the field in @duncit/host-pod-actions PodEditDialog (rule 27).
 */
export function PodEditSmartIncentive({
  form,
  unitPrice,
  currency,
}: Readonly<{ form: PodEditForm; unitPrice: number; currency: string }>) {
  const { watch, setValue, formState } = form;
  const field = useSmartIncentiveField({
    enabled: watch('smart_incentive_enabled'),
    pct: watch('smart_incentive_pct'),
    unitPrice,
    currency,
    error: formState.errors.smart_incentive_pct?.message,
    onEnabledChange: (next) => setValue('smart_incentive_enabled', next, { shouldDirty: true }),
    onPctChange: (next) =>
      setValue('smart_incentive_pct', next, { shouldDirty: true, shouldValidate: true }),
  });
  return field ? <SmartIncentiveField {...field} /> : null;
}
