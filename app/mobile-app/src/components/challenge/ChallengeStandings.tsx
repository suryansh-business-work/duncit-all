import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  standings: Pick<
    PodChallengeView['standings'][number],
    'competitor_id' | 'name' | 'rank' | 'total'
  >[];
  /** Show only the first N rows (the live card's preview). */
  limit?: number;
  large?: boolean;
}

/**
 * Ranked competitors exactly as the server ranked them (ties share a rank).
 * The Tamagui twin of mWeb's ChallengeStandings (rule 27).
 */
export function ChallengeStandings({ standings, limit, large }: Readonly<Props>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const rows = limit ? standings.slice(0, limit) : standings;
  const medal = [colors.warning, colors.muted, colors.primary];

  if (!rows.length) {
    return (
      <Text fontSize={14} color="$muted">
        {t('mweb.challenge.noStandings')}
      </Text>
    );
  }
  return (
    <YStack role="list" aria-label={t('mweb.challenge.standings')}>
      {rows.map((s) => (
        <XStack
          key={s.competitor_id}
          role="listitem"
          alignItems="center"
          gap={12}
          paddingVertical={large ? 12 : 8}
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
          aria-label={`${t('mweb.challenge.rank', { vars: { rank: s.rank } })}, ${s.name}, ${t('mweb.challenge.score', { vars: { score: s.total } })}`}
        >
          <XStack width={large ? 44 : 30} justifyContent="center">
            {s.rank <= 3 ? (
              <MaterialIcons name="emoji-events" size={large ? 30 : 20} color={medal[s.rank - 1]} />
            ) : (
              <Text fontSize={large ? 20 : 14} fontWeight="700" color="$color">
                {s.rank}
              </Text>
            )}
          </XStack>
          <Text
            flex={1}
            numberOfLines={1}
            fontSize={large ? 20 : 15}
            fontWeight={s.rank === 1 ? '800' : '500'}
            color="$color"
          >
            {s.name}
          </Text>
          <Text
            fontSize={large ? 26 : 16}
            fontWeight="800"
            color="$color"
            fontVariant={['tabular-nums']}
          >
            {s.total}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}
