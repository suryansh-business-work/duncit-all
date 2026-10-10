import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { CHALLENGE_STATUS_KEYS, isChallengeFinished, parseJsonObject } from '@duncit/utils';

import { LoadingIndicator } from '@/components/LoadingIndicator';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import { ChallengeBallots } from '@/components/challenge/ChallengeBallots';
import { ChallengeClock } from '@/components/challenge/ChallengeClock';
import { ChallengeJudgeSheet } from '@/components/challenge/ChallengeJudgeSheet';
import { ChallengeResultCard } from '@/components/challenge/ChallengeResultCard';
import { ChallengeStandings } from '@/components/challenge/ChallengeStandings';
import { usePodChallengeLive, type PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/** The arena during play: clocks, the leaderboard, and whatever this viewer may do. */
function LiveBody({
  challenge,
  receivedAt,
  onChanged,
}: Readonly<{
  challenge: PodChallengeView;
  receivedAt: number;
  onChanged: (next: PodChallengeView) => void;
}>) {
  const { t } = useTranslation();
  const rounds = challenge.tools.find((tool) => tool.input_kind === 'ROUND');
  const totalRounds = rounds ? Number(parseJsonObject(rounds.config_json).rounds ?? 1) : 0;
  const ballots = challenge.viewer.can_interact
    ? challenge.tools.filter((tool) => tool.input_kind === 'VOTE' || tool.input_kind === 'RATE')
    : [];
  const judging = challenge.viewer.can_judge
    ? challenge.tools.filter((tool) => tool.input_kind === 'JUDGE')
    : [];

  return (
    <YStack gap={16}>
      <XStack gap={10} alignItems="center" flexWrap="wrap">
        <Text
          fontSize={13}
          fontWeight="700"
          color={challenge.status === 'LIVE' ? '$danger' : '$muted'}
        >
          {t(CHALLENGE_STATUS_KEYS[challenge.status] ?? challenge.status)}
        </Text>
        {totalRounds > 0 && (
          <Text fontSize={13} color="$muted">
            {t('mweb.challenge.roundOf', {
              vars: { round: challenge.current_round, total: totalRounds },
            })}
          </Text>
        )}
      </XStack>
      {challenge.tools
        .filter((tool) => tool.input_kind === 'CLOCK')
        .map((tool) => (
          <ChallengeClock key={tool.instance_id} tool={tool} receivedAt={receivedAt} large />
        ))}
      <YStack gap={6}>
        <Text fontSize={17} fontWeight="800" color="$color" role="heading">
          {t('mweb.challenge.leaderboard')}
        </Text>
        <ChallengeStandings standings={challenge.standings} large />
      </YStack>
      {ballots.map((tool) => (
        <ChallengeBallots
          key={tool.instance_id}
          challenge={challenge}
          tool={tool}
          onChanged={onChanged}
        />
      ))}
      {judging.map((tool) => (
        <ChallengeJudgeSheet
          key={tool.instance_id}
          challenge={challenge}
          tool={tool}
          onChanged={onChanged}
        />
      ))}
    </YStack>
  );
}

/**
 * The Live Challenge Arena — the Tamagui twin of mWeb's
 * /pod/:podId/challenges/:challengeId/live (rule 27). Spectators read,
 * confirmed attendees vote while voting is open, judges get their sheet;
 * every permission is decided by the server.
 */
export function ChallengeArenaScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ChallengeArena'>>();
  const { challenge, isLoading, error, receivedAt, adopt } = usePodChallengeLive(
    params?.challengeId ?? '',
  );

  const body = () => {
    if (isLoading) return <LoadingIndicator />;
    if (!challenge) {
      return (
        <NoticeCard
          tone={error ? 'danger' : 'info'}
          title={error || t('mweb.challenge.notAvailable')}
        />
      );
    }
    if (!isChallengeFinished(challenge.status)) {
      return <LiveBody challenge={challenge} receivedAt={receivedAt} onChanged={adopt} />;
    }
    if (!challenge.result)
      return <NoticeCard tone="info" title={t('mweb.challenge.resultsPending')} />;
    const winners = challenge.result.standings
      .filter((s) => challenge.result?.winner_ids.includes(s.competitor_id))
      .map((s) => s.name)
      .join(', ');
    return (
      <YStack gap={16}>
        <YStack alignItems="center" gap={8} aria-live="polite">
          <MaterialIcons name="emoji-events" size={64} color={colors.warning} />
          <Text fontSize={26} fontWeight="900" color="$color" textAlign="center">
            {t('mweb.challenge.winnerAnnouncement', { vars: { names: winners } })}
          </Text>
        </YStack>
        <ChallengeResultCard challenge={challenge} />
      </YStack>
    );
  };

  return (
    <StackScreen
      title={challenge?.name ?? t('mweb.challenge.arenaTitle')}
      testID="challenge-arena-screen"
    >
      <RefreshScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {body()}
      </RefreshScrollView>
    </StackScreen>
  );
}
