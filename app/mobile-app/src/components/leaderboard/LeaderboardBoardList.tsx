import { Text, XStack, YStack } from 'tamagui';

import { leaderboardMedal, type LeaderboardMedal } from '@duncit/utils';
import { AppImage } from '@/components/AppImage';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeaderboardEntryShape } from './types';

/** Podium metals — page-local colour constants, same values as mWeb's list. */
const MEDAL_COLOR: Record<LeaderboardMedal, string> = {
  gold: '#F2A413',
  silver: '#9FA8B2',
  bronze: '#C77B45',
};

function RankAvatar({
  entry,
  size,
  borderColor,
}: Readonly<{ entry: LeaderboardEntryShape; size: number; borderColor: string }>) {
  const initial = (entry.name || '?').charAt(0).toUpperCase();
  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      borderWidth={3}
      borderColor={borderColor}
      backgroundColor="$surface"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
    >
      {entry.avatar_url ? (
        <AppImage source={{ uri: entry.avatar_url }} style={{ width: size, height: size }} />
      ) : (
        <Text fontSize={size / 3} fontWeight="700" color="$color">
          {initial}
        </Text>
      )}
    </YStack>
  );
}

function PodiumSpot({ entry }: Readonly<{ entry: LeaderboardEntryShape }>) {
  const { t } = useTranslation();
  const medal = leaderboardMedal(entry.rank);
  const color = medal ? MEDAL_COLOR[medal] : 'transparent';
  const size = entry.rank === 1 ? 76 : 60;
  return (
    <YStack alignItems="center" gap={4} width={96}>
      <RankAvatar entry={entry} size={size} borderColor={color} />
      <Text fontSize={12} fontWeight="700" style={{ color }}>
        #{entry.rank}
      </Text>
      <Text fontSize={12} fontWeight="700" color="$color" numberOfLines={1}>
        {entry.name || t('mweb.leaderboard.anonymous')}
      </Text>
      <Text fontSize={11} color="$muted">
        {entry.points} {t('mweb.leaderboard.pointsShort')}
      </Text>
    </YStack>
  );
}

function BoardRow({ entry }: Readonly<{ entry: LeaderboardEntryShape }>) {
  const { t } = useTranslation();
  return (
    <XStack
      testID={`leaderboard-row-${entry.rank}`}
      alignItems="center"
      gap={12}
      paddingHorizontal={12}
      paddingVertical={8}
      borderRadius={12}
      backgroundColor={entry.is_me ? '$surface' : 'transparent'}
      borderWidth={entry.is_me ? 1 : 0}
      borderColor="$borderColor"
    >
      <Text width={32} fontSize={13} fontWeight="700" color="$muted">
        #{entry.rank}
      </Text>
      <RankAvatar entry={entry} size={36} borderColor="transparent" />
      <Text
        flex={1}
        fontSize={14}
        fontWeight={entry.is_me ? '700' : '500'}
        color="$color"
        numberOfLines={1}
      >
        {entry.name || t('mweb.leaderboard.anonymous')}
      </Text>
      <Text fontSize={14} fontWeight="700" color="$color">
        {entry.points}{' '}
        <Text fontSize={11} color="$muted">
          {t('mweb.leaderboard.pointsShort')}
        </Text>
      </Text>
    </XStack>
  );
}

/** The ranked board: a three-spot podium, then the plain rows — RN twin of
 * mWeb's <LeaderboardList/>. The caller's own row is outlined. */
export function LeaderboardBoardList({ rows }: Readonly<{ rows: LeaderboardEntryShape[] }>) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <Text
        testID="leaderboard-empty"
        textAlign="center"
        paddingVertical={32}
        fontSize={13}
        color="$muted"
      >
        {t('mweb.leaderboard.emptyBoard')}
      </Text>
    );
  }

  const podium = rows.filter((entry) => leaderboardMedal(entry.rank) !== null);
  const rest = rows.filter((entry) => leaderboardMedal(entry.rank) === null);
  // Silver – gold – bronze, so #1 stands in the middle, a head taller.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(
    (entry): entry is LeaderboardEntryShape => Boolean(entry),
  );

  return (
    <YStack gap={12}>
      <XStack justifyContent="center" alignItems="flex-end" gap={8}>
        {podiumOrder.map((entry) => (
          <PodiumSpot key={entry.user_id} entry={entry} />
        ))}
      </XStack>
      <YStack paddingHorizontal={8} gap={2}>
        {rest.map((entry) => (
          <BoardRow key={entry.user_id} entry={entry} />
        ))}
      </YStack>
    </YStack>
  );
}
