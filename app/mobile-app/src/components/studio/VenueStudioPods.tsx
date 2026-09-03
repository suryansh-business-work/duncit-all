import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import { venueCancelSuccessMessage, type VenueCancelPodResult } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { StudioPod } from './studio-pods';
import { StudioPodsSection } from './StudioPodsSection';
import type { StudioPodsState } from './useStudioPods';
import { VenueCancelPodSheet } from './VenueCancelPodSheet';
import { VenuePodDetailSheet } from './VenuePodDetailSheet';

interface Props {
  state: StudioPodsState;
  testID: string;
}

/**
 * Venue Studio's pod section with its two per-pod actions: tap a row for the
 * detail sheet, or cancel an upcoming pod through the confirm-and-explain
 * sheet. Club Studio renders the plain section — a club admin has no cancel.
 */
export function VenueStudioPods({ state, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<StudioPod | null>(null);
  const [cancelling, setCancelling] = useState<StudioPod | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onCancelled = (result: VenueCancelPodResult) => {
    setCancelling(null);
    setNotice(venueCancelSuccessMessage(result, t));
    state.refetch();
  };

  return (
    <YStack gap={10}>
      {notice ? (
        <Text testID={`${testID}-notice`} fontSize={12.5} fontWeight="600" color="$success">
          {notice}
        </Text>
      ) : null}
      <StudioPodsSection
        variant="VENUE"
        state={state}
        testID={testID}
        onOpenPod={setDetail}
        onCancelPod={setCancelling}
      />
      <VenuePodDetailSheet
        pod={detail}
        currencySymbol={state.figures.currency_symbol}
        onClose={() => setDetail(null)}
      />
      <VenueCancelPodSheet
        pod={cancelling}
        onClose={() => setCancelling(null)}
        onCancelled={onCancelled}
      />
    </YStack>
  );
}
