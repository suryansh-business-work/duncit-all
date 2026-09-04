import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import {
  changeRequestMenuKey,
  venueCancelSuccessMessage,
  type VenueCancelPodResult,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { StudioPod } from './studio-pods';
import { StudioPodsSection } from './StudioPodsSection';
import type { StudioPodsState } from './useStudioPods';
import { VenueCancelPodSheet } from './VenueCancelPodSheet';
import { VenuePodDetailSheet } from './VenuePodDetailSheet';
import { RequestChangeSheet } from '@/components/change-requests/RequestChangeSheet';
import { usePodChangeRequests } from '@/hooks/usePodChangeRequests';

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
  // "Request Change Venue" — the non-destructive answer beside Cancel: the pod
  // moves to another venue and every seat sold moves with it.
  const [changePod, setChangePod] = useState<StudioPod | null>(null);
  const change = usePodChangeRequests();

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
        onRequestChange={setChangePod}
        requestChangeLabel={t(changeRequestMenuKey('VENUE'))}
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
      <RequestChangeSheet
        open={!!changePod}
        role="VENUE"
        penalty={change.board.penalties.venue_penalty}
        attendeeCount={changePod?.attendee_count ?? 0}
        busy={change.busy}
        errorText={change.feedback?.ok === false ? change.feedback.text : null}
        onClose={() => setChangePod(null)}
        onConfirm={(reason) => {
          const pod = changePod;
          if (!pod) return;
          change
            .file(pod.id, 'VENUE', reason, t('changeRequest.filed'))
            .then((ok) => {
              if (ok) {
                setChangePod(null);
                setNotice(t('changeRequest.filed'));
              }
              return undefined;
            })
            .catch(() => undefined);
        }}
      />
    </YStack>
  );
}
