import { useState } from 'react';
import { XStack, YStack } from 'tamagui';
import { isChallengeFinished, isChallengeInPlay } from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import { ChallengeResultCard } from '@/components/challenge/ChallengeResultCard';
import { ChallengeStandings } from '@/components/challenge/ChallengeStandings';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ReasonSheet } from './ReasonSheet';

interface Props {
  challenge: PodChallengeView;
  actions: HostChallengeActions;
}

/**
 * Finalize & Publish, the corrected-result path for Challenge staff, and the
 * "send the link now" buttons — the Tamagui twin of mWeb's HostResultPanel +
 * HostNotifications (rule 27). A published result is locked; a correction is a
 * new version with a reason.
 */
export function HostChallengeFinish({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const finished = isChallengeFinished(challenge.status);
  const kind = challenge.result ? 'RESULT' : 'LIVE';
  const canNotify = challenge.result ? true : isChallengeInPlay(challenge.status);

  return (
    <YStack gap={12}>
      {canNotify && (
        <XStack gap={8} flexWrap="wrap">
          <DuncitButton
            size="sm"
            disabled={actions.busy}
            label={t(
              kind === 'RESULT' ? 'mweb.challenge.sendResultNow' : 'mweb.challenge.sendLiveNow',
            )}
            onPress={() => fireAndForget(actions.notify(kind, false))}
            testID="challenge-notify-send"
          />
          <DuncitButton
            size="sm"
            variant="ghost"
            disabled={actions.busy}
            label={t('mweb.challenge.resendFailed')}
            onPress={() => fireAndForget(actions.notify(kind, true))}
            testID="challenge-notify-retry"
          />
        </XStack>
      )}
      {finished && challenge.result && <ChallengeResultCard challenge={challenge} />}
      {finished && challenge.result && challenge.viewer.is_staff && (
        <DuncitButton
          size="sm"
          variant="outline"
          tone="danger"
          label={t('mweb.challenge.publishCorrection')}
          onPress={() => setCorrecting(true)}
          testID="challenge-correct"
        />
      )}
      {finished && !challenge.result && (
        <YStack gap={10}>
          <NoticeCard tone="info" title={t('mweb.challenge.reviewBeforePublish')} />
          <ChallengeStandings standings={challenge.standings} />
          <DuncitButton
            disabled={actions.busy || !challenge.standings.length}
            label={t('mweb.challenge.finalizePublish')}
            onPress={() => setConfirming(true)}
            testID="challenge-publish"
            fullWidth
          />
        </YStack>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('mweb.challenge.publishTitle')}
        message={t('mweb.challenge.publishBody', { vars: { name: challenge.name } })}
        confirmLabel={t('mweb.challenge.publish')}
        cancelLabel={t('mweb.challenge.cancel')}
        busy={actions.busy}
        onCancel={() => setConfirming(false)}
        onConfirm={() => fireAndForget(actions.publish().then(() => setConfirming(false)))}
        testID="challenge-publish-confirm"
      />
      <ReasonSheet
        open={correcting}
        title={t('mweb.challenge.publishCorrection')}
        message={t('mweb.challenge.correctionBody')}
        confirmLabel={t('mweb.challenge.publish')}
        required
        busy={actions.busy}
        onClose={() => setCorrecting(false)}
        onSubmit={(reason) =>
          fireAndForget(
            actions.publish(reason).then((ok) => {
              if (ok) setCorrecting(false);
            }),
          )
        }
      />
    </YStack>
  );
}
