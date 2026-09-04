import { useEffect } from 'react';
import { XStack, YStack } from 'tamagui';
import type { AutoPodLabels, AutoPodRow } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { HostEarningsFields } from '@/components/auto-pods/HostEarningsFields';
import { useAutoPodPricing } from '@/hooks/useAutoPodPricing';

interface Props {
  row: AutoPodRow | null;
  labels: AutoPodLabels;
  onClose: () => void;
  formatMoney: (amount: number) => string;
  /** What the host worked out, for the card's "You could earn" line. */
  onEarnings: (amount: number | null) => void;
}

/**
 * A host's "View Potential Earnings": what this offer would pay THEM at a
 * ticket price they choose and the spots they drag to, under their own rates
 * and the venue's slot price. Read-only — assigning is a separate, deliberate
 * step — so a host can price the pod before deciding whether to take it.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `HostEarningsDialog` (rule 27).
 */
export function HostEarningsSheet({
  row,
  labels,
  onClose,
  formatMoney,
  onEarnings,
}: Readonly<Props>) {
  const pricing = useAutoPodPricing(row);

  // The card's earn line follows the calculator live, so closing the sheet is
  // never the moment a host discovers what they had worked out.
  const host = pricing.viable ? (pricing.projection?.host_receives ?? null) : null;
  useEffect(() => {
    if (row) onEarnings(host);
  }, [row, host, onEarnings]);

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <PillButton
          testID="auto-pod-earnings-close"
          label={labels.close}
          onPress={onClose}
          variant="solid"
          disabled={false}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={!!row}
      onClose={onClose}
      testID="auto-pod-host-earnings-sheet"
      title={labels.earningsTitle}
      closeLabel={labels.closeAria}
      footer={footer}
    >
      <HostEarningsFields
        price={pricing.price}
        onPrice={pricing.setPrice}
        spots={pricing.spots}
        onSpots={pricing.setSpots}
        projection={pricing.projection}
        loading={pricing.loading}
        failed={pricing.failed}
        labels={labels}
        formatMoney={formatMoney}
      />
    </DuncitDialog>
  );
}
