import { usePublicFinance } from '@/hooks/usePublicFinance';
import { podEditCarriesSmartIncentive, type HostPodSummary } from './pod-edit.form';
import { PodEditSmartIncentive } from './PodEditSmartIncentive';
import { PodEditTicketDiscount } from './PodEditTicketDiscount';
import type { PodEditForm } from './usePodEditForm';

/**
 * A paid pod's offers inside the host's Edit Pod sheet: the multi-ticket
 * discount and, when the row says what the pod offers now, the Smart
 * Incentive. Both price off the pod as published (the price is not editable
 * here) in the admin's currency, read once for the two.
 */
export function PodEditOffers({
  form,
  pod,
}: Readonly<{ form: PodEditForm; pod: HostPodSummary | null }>) {
  const { currency } = usePublicFinance();
  const unitPrice = Number(pod?.pod_amount) || 0;
  return (
    <>
      <PodEditTicketDiscount form={form} unitPrice={unitPrice} currency={currency} />
      {podEditCarriesSmartIncentive(pod) ? (
        <PodEditSmartIncentive form={form} unitPrice={unitPrice} currency={currency} />
      ) : null}
    </>
  );
}
