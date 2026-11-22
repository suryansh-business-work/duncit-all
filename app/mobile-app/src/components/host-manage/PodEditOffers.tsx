import { usePublicFinance } from '@/hooks/usePublicFinance';
import { podEditCarriesSmartIncentive, type HostPodSummary } from './pod-edit.form';
import { PodEditSmartIncentive } from './PodEditSmartIncentive';
import type { PodEditForm } from './usePodEditForm';

/**
 * A paid pod's offer inside the host's Edit Pod sheet: the Smart Incentive,
 * when the row says what the pod offers now. It prices off the pod as
 * published (the price is not editable here) in the admin's currency.
 */
export function PodEditOffers({
  form,
  pod,
}: Readonly<{ form: PodEditForm; pod: HostPodSummary | null }>) {
  const { currency } = usePublicFinance();
  if (!podEditCarriesSmartIncentive(pod)) return null;
  return (
    <PodEditSmartIncentive
      form={form}
      unitPrice={Number(pod?.pod_amount) || 0}
      currency={currency}
    />
  );
}
