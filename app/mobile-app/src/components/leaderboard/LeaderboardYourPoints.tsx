import { Text, XStack, YStack } from 'tamagui';

import { IconDisc } from '@/components/account/IconDisc';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeaderboardBoardShape } from './types';

/** The hero: the caller's points and rank on the selected board, first on the
 * screen so "your standing" reads before anyone else's — RN twin of mWeb's
 * <YourPointsCard/>. */
export function LeaderboardYourPoints({
  board,
  isLoading,
}: Readonly<{ board: LeaderboardBoardShape | null; isLoading: boolean }>) {
  const { t } = useTranslation();

  const participants = board?.participants ?? 0;
  const participantsLine =
    participants === 1
      ? t('mweb.leaderboard.participantsOne')
      : t('mweb.leaderboard.participantsMany', { count: participants });
  const rankLine = board?.my_rank
    ? t('mweb.leaderboard.yourRank', { vars: { rank: board.my_rank } })
    : t('mweb.leaderboard.notRanked');
  const pointsLabel = isLoading && !board ? '—' : String(board?.my_points ?? 0);

  return (
    <SurfaceCard testID="leaderboard-your-points" marginHorizontal={16} padding={20}>
      <XStack alignItems="center" justifyContent="space-between" gap={16}>
        <YStack gap={2} flex={1}>
          <Text fontSize={12} fontWeight="600" color="$muted">
            {t('mweb.leaderboard.yourPoints')}
          </Text>
          <Text fontSize={34} fontWeight="700" lineHeight={40} color="$color">
            {pointsLabel}
          </Text>
          <Text fontSize={14} fontWeight="500" color="$color">
            {rankLine}
          </Text>
          <Text fontSize={12} color="$muted">
            {participantsLine}
          </Text>
          {!board?.my_rank && (
            <Text fontSize={12} color="$muted">
              {t('mweb.leaderboard.notRankedHint')}
            </Text>
          )}
        </YStack>
        <IconDisc icon="emoji-events" size={64} />
      </XStack>
    </SurfaceCard>
  );
}
