import { Fragment } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { leaderboardMedal, type LeaderboardMedal } from '@duncit/utils';
import { AppImage } from '@/components/AppImage';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeaderboardEntryShape } from './types';

type MedalTone = '$warning' | '$muted' | '$accent';

/** Podium metals as theme tokens — gold, silver, bronze — so the ring flips
 * with light/dark like every other colour. mWeb twin: LeaderboardList. */
const MEDAL_TONE: Record<LeaderboardMedal, MedalTone> = {
  gold: '$warning',
  silver: '$muted',
  bronze: '$accent',
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
      backgroundColor="$soft"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
    >
      {entry.avatar_url ? (
        <AppImage source={{ uri: entry.avatar_url }} style={{ width: size, height: size }} />
      ) : (
        <Text fontSize={size / 3} fontWeight="600" color="$color">
          {initial}
        </Text>
      )}
    </YStack>
  );
}

/** The small soft pill a rank sits in. */
function RankPill({ rank, color = '$color' }: Readonly<{ rank: number; color?: string }>) {
  return (
    <XStack
      minWidth={32}
      height={22}
      paddingHorizontal={8}
      borderRadius={999}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$soft"
    >
      <Text fontSize={12} fontWeight="700" color={color}>
        #{rank}
      </Text>
    </XStack>
  );
}

function PodiumSpot({ entry }: Readonly<{ entry: LeaderboardEntryShape }>) {
  const { t } = useTranslation();
  const medal = leaderboardMedal(entry.rank);
  const tone = medal ? MEDAL_TONE[medal] : 'transparent';
  const size = entry.rank === 1 ? 76 : 60;
  return (
    <YStack alignItems="center" gap={4} width={96}>
      <RankAvatar entry={entry} size={size} borderColor={tone} />
      <RankPill rank={entry.rank} color={tone} />
      <Text fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
        {entry.name || t('mweb.leaderboard.anonymous')}
      </Text>
      <Text fontSize={12} color="$muted">
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
      paddingHorizontal={16}
      paddingVertical={10}
      backgroundColor={entry.is_me ? '$primarySoft' : 'transparent'}
    >
      <RankPill rank={entry.rank} />
      <RankAvatar entry={entry} size={36} borderColor="transparent" />
      <Text
        flex={1}
        fontSize={14}
        fontWeight={entry.is_me ? '600' : '500'}
        color="$color"
        numberOfLines={1}
      >
        {entry.name || t('mweb.leaderboard.anonymous')}
      </Text>
      <Text fontSize={14} fontWeight="700" color="$color">
        {entry.points}{' '}
        <Text fontSize={12} color="$muted">
          {t('mweb.leaderboard.pointsShort')}
        </Text>
      </Text>
    </XStack>
  );
}

/** The ranked board in one card: a three-spot podium, then the plain rows —
 * RN twin of mWeb's <LeaderboardList/>. The caller's own row is tinted. */
export function LeaderboardBoardList({ rows }: Readonly<{ rows: LeaderboardEntryShape[] }>) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <Text
        testID="leaderboard-empty"
        textAlign="center"
        paddingVertical={32}
        fontSize={14}
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
    <SurfaceCard marginHorizontal={16} padding={0} overflow="hidden">
      <XStack justifyContent="center" alignItems="flex-end" gap={8} padding={16}>
        {podiumOrder.map((entry) => (
          <PodiumSpot key={entry.user_id} entry={entry} />
        ))}
      </XStack>
      {rest.map((entry) => (
        <Fragment key={entry.user_id}>
          <YStack height={1} backgroundColor="$borderColor" />
          <BoardRow entry={entry} />
        </Fragment>
      ))}
    </SurfaceCard>
  );
}
