import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import { changeRequestMenuKey } from '@duncit/utils';

import { RequestChangeSheet } from '@/components/change-requests/RequestChangeSheet';
import { StudioPodsSection } from '@/components/studio/StudioPodsSection';
import type { StudioPod } from '@/components/studio/studio-pods';
import type { StudioPodsState } from '@/components/studio/useStudioPods';
import { usePodChangeRequests } from '@/hooks/usePodChangeRequests';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Club Studio's "Your Pods", with the one action a club admin has on a row:
 * asking Duncit for a different club admin.
 *
 * The twin of mWeb's `ClubPodsSection` (rule 27). It sits beside
 * `VenueStudioPods` rather than inside the shared section, for the same reason
 * that one does: the section renders the rows, and each studio owns what its
 * rows DO — a club admin has no cancel, and a venue owner is not handing over
 * a club.
 *
 * Note the ask is CLUB-level: the pod's club is what carries the assignment, so
 * approving hands over the whole club, not just this pod. The confirm sheet's
 * copy says exactly that.
 */
export function ClubStudioChangeRequests({ state }: Readonly<{ state: StudioPodsState }>) {
  const { t } = useTranslation();
  const [changePod, setChangePod] = useState<StudioPod | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const change = usePodChangeRequests();

  return (
    <YStack gap={10}>
      {notice ? (
        <Text testID="club-studio-change-notice" fontSize={12.5} fontWeight="600" color="$success">
          {notice}
        </Text>
      ) : null}
      <StudioPodsSection
        variant="CLUB"
        state={state}
        testID="club-studio-pods"
        onRequestChange={setChangePod}
        requestChangeLabel={t(changeRequestMenuKey('CLUB_ADMIN'))}
      />
      <RequestChangeSheet
        open={!!changePod}
        role="CLUB_ADMIN"
        penalty={change.board.penalties.club_admin_penalty}
        attendeeCount={changePod?.attendee_count ?? 0}
        busy={change.busy}
        errorText={change.feedback?.ok === false ? change.feedback.text : null}
        onClose={() => setChangePod(null)}
        onConfirm={(reason) => {
          const pod = changePod;
          if (!pod) return;
          change
            .file(pod.id, 'CLUB_ADMIN', reason, t('changeRequest.filed'))
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
