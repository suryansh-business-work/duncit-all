import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { CHALLENGE_STATUS_KEYS, isChallengeFinished } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { usePodChallengeLive } from '@/hooks/usePodChallengeLive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { ChallengeClock } from './ChallengeClock';
import { ChallengeResultCard } from './ChallengeResultCard';
import { ChallengeStandings } from './ChallengeStandings';

const PREVIEW_ROWS = 3;

interface Props {
  challengeId: string;
  onOpen: (podId: string, challengeId: string) => void;
}

/**
 * One challenge on Pod Details, kept live: during play a LIVE preview with the
 * full-screen link; once the result is published the Final Result card
 * replaces it. The Tamagui twin of mWeb's LiveChallengeCard (rule 27).
 */
export function LiveChallengeCard({ challengeId, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { formatDateTime } = useDateFormat();
  const { challenge, receivedAt } = usePodChallengeLive(challengeId);
  if (!challenge) return null;
  const open = () => onOpen(challenge.pod_id, challenge.id);
  if (isChallengeFinished(challenge.status)) {
    return challenge.result ? <ChallengeResultCard challenge={challenge} onView={open} /> : null;
  }
  const timer = challenge.tools.find((tool) => tool.input_kind === 'CLOCK');

  return (
    <SurfaceCard gap={10} testID={`live-challenge-${challenge.id}`}>
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="sports-score" size={20} color={colors.primary} />
        <Text flex={1} fontSize={12} fontWeight="800" color="$muted" textTransform="uppercase">
          {t('mweb.challenge.liveChallenge')}
        </Text>
        <Text
          fontSize={12}
          fontWeight="700"
          color={challenge.status === 'LIVE' ? '$danger' : '$muted'}
        >
          {t(CHALLENGE_STATUS_KEYS[challenge.status] ?? challenge.status)}
        </Text>
      </XStack>
      <Text fontSize={18} fontWeight="800" color="$color" role="heading">
        {challenge.name}
      </Text>
      {timer && <ChallengeClock tool={timer} receivedAt={receivedAt} />}
      <ChallengeStandings standings={challenge.standings} limit={PREVIEW_ROWS} />
      <Text fontSize={12} color="$muted">
        {t('mweb.challenge.lastUpdated', { vars: { time: formatDateTime(challenge.updated_at) } })}
      </Text>
      <DuncitButton
        label={t('mweb.challenge.viewLive')}
        onPress={open}
        testID={`live-challenge-open-${challenge.id}`}
        fullWidth
      />
    </SurfaceCard>
  );
}
