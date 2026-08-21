import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeaderboardBoardShape } from './types';

/** The hero: the caller's points and rank on the selected board, on the brand
 * colour so "your standing" reads before anyone else's — RN twin of mWeb's
 * <YourPointsCard/>. */
export function LeaderboardYourPoints({
  board,
  isLoading,
}: Readonly<{ board: LeaderboardBoardShape | null; isLoading: boolean }>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();

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
    <YStack
      testID="leaderboard-your-points"
      marginHorizontal={16}
      padding={18}
      borderRadius={16}
      backgroundColor="$primary"
    >
      <XStack alignItems="center" justifyContent="space-between" gap={12}>
        <YStack gap={2} flex={1}>
          <Text
            fontSize={11}
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing={1}
            color="$onPrimary"
            opacity={0.85}
          >
            {t('mweb.leaderboard.yourPoints')}
          </Text>
          <Text fontSize={34} fontWeight="700" color="$onPrimary">
            {pointsLabel}
          </Text>
          <Text fontSize={13} color="$onPrimary" opacity={0.9}>
            {rankLine}
          </Text>
          <Text fontSize={11} color="$onPrimary" opacity={0.75}>
            {participantsLine}
          </Text>
          {!board?.my_rank && (
            <Text fontSize={11} color="$onPrimary" opacity={0.75}>
              {t('mweb.leaderboard.notRankedHint')}
            </Text>
          )}
        </YStack>
        <MaterialIcons name="emoji-events" size={56} color={onPrimary} />
      </XStack>
    </YStack>
  );
}
