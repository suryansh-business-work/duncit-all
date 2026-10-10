import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { CHALLENGE_STATUS_KEYS, isChallengeFinished, isChallengeInPlay } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import { useHostChallengeActions } from '@/hooks/useHostChallengeActions';
import { usePodChallengeLive } from '@/hooks/usePodChallengeLive';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { shareChallenge } from '@/utils/share';

import { HostChallengeControls } from './HostChallengeControls';
import { HostChallengeFinish } from './HostChallengeFinish';
import { HostChallengeLive } from './HostChallengeLive';
import { HostChallengeLog } from './HostChallengeLog';
import { RosterSheet } from './RosterSheet';

interface Props {
  challengeId: string;
  onOpenArena: (podId: string, challengeId: string) => void;
}

/** One challenge in Host Studio: lifecycle, switches, roster, live scoring, undo log and the result. */
export function HostChallengeCard({ challengeId, onOpenArena }: Readonly<Props>) {
  const { t } = useTranslation();
  const { challenge, receivedAt, adopt } = usePodChallengeLive(challengeId);
  const actions = useHostChallengeActions(challengeId, adopt);
  const [rosterOpen, setRosterOpen] = useState(false);
  if (!challenge) return null;
  const inPlay = isChallengeInPlay(challenge.status);
  const finished = isChallengeFinished(challenge.status);

  return (
    <SurfaceCard gap={14} testID={`host-challenge-${challenge.id}`}>
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={18} fontWeight="800" color="$color" role="heading">
          {challenge.name}
        </Text>
        <Text
          fontSize={12}
          fontWeight="700"
          color={challenge.status === 'LIVE' ? '$danger' : '$muted'}
        >
          {t(CHALLENGE_STATUS_KEYS[challenge.status] ?? challenge.status)}
        </Text>
      </XStack>
      {challenge.eligibility_warning ? (
        <NoticeCard tone="warning" title={t('mweb.challenge.eligibilityWarning')} />
      ) : null}
      {actions.error ? <NoticeCard tone="danger" title={actions.error} /> : null}
      <HostChallengeControls challenge={challenge} actions={actions} />
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          size="sm"
          variant="outline"
          disabled={finished || challenge.status === 'CANCELLED'}
          label={t('mweb.challenge.rosterButton', {
            vars: { count: challenge.competitors.length },
          })}
          onPress={() => setRosterOpen(true)}
          testID={`host-challenge-roster-${challenge.id}`}
        />
        <DuncitButton
          size="sm"
          variant="ghost"
          label={t('mweb.challenge.viewLive')}
          onPress={() => onOpenArena(challenge.pod_id, challenge.id)}
          testID={`host-challenge-arena-${challenge.id}`}
        />
        <DuncitButton
          size="sm"
          variant="ghost"
          label={t('mweb.challenge.share')}
          onPress={() =>
            fireAndForget(shareChallenge(challenge.pod_id, challenge.id, challenge.name))
          }
          testID={`host-challenge-share-${challenge.id}`}
        />
      </XStack>
      {inPlay && (
        <HostChallengeLive challenge={challenge} receivedAt={receivedAt} actions={actions} />
      )}
      {(inPlay || finished) && (
        <YStack gap={8}>
          <Text fontSize={14} fontWeight="700" color="$color" role="heading">
            {t('mweb.challenge.scoreLog')}
          </Text>
          <HostChallengeLog challenge={challenge} actions={actions} />
        </YStack>
      )}
      <HostChallengeFinish challenge={challenge} actions={actions} />
      <RosterSheet
        open={rosterOpen}
        challenge={challenge}
        actions={actions}
        onClose={() => setRosterOpen(false)}
      />
    </SurfaceCard>
  );
}
