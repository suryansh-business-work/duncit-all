import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { shareChallenge } from '@/utils/share';

import { ChallengeStandings } from './ChallengeStandings';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'pod_id' | 'name' | 'result'>;
  /** Opens the arena; omitted on the arena itself. */
  onView?: () => void;
}

/**
 * The Final Result card: the published, locked result — never live standings.
 * The Tamagui twin of mWeb's ChallengeResultCard (rule 27).
 */
export function ChallengeResultCard({ challenge, onView }: Readonly<Props>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { formatDateTime } = useDateFormat();
  const [expanded, setExpanded] = useState(false);
  const result = challenge.result;
  if (!result) return null;
  const winners = result.standings.filter((s) => result.winner_ids.includes(s.competitor_id));
  const podium = result.standings.filter((s) => s.rank > 1 && s.rank <= 3);

  return (
    <SurfaceCard gap={10} testID={`challenge-result-${challenge.id}`}>
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="emoji-events" size={22} color={colors.warning} />
        <Text flex={1} fontSize={16} fontWeight="800" color="$color" role="heading">
          {challenge.name}
        </Text>
        <Text fontSize={12} fontWeight="700" color="$success">
          {t('mweb.challenge.completed')}
        </Text>
      </XStack>
      <Text fontSize={18} fontWeight="800" color="$color">
        {t(winners.length > 1 ? 'mweb.challenge.winnersTie' : 'mweb.challenge.winner', {
          vars: { names: winners.map((w) => w.name).join(', '), score: winners[0]?.total ?? '' },
        })}
      </Text>
      {podium.length > 0 && (
        <Text fontSize={14} color="$muted">
          {podium
            .map((p) => t('mweb.challenge.placed', { vars: { rank: p.rank, name: p.name } }))
            .join(' · ')}
        </Text>
      )}
      <Text fontSize={12} color="$muted">
        {t('mweb.challenge.publishedOn', { vars: { date: formatDateTime(result.published_at) } })}
        {result.version > 1 ? ` · ${t('mweb.challenge.corrected')}` : ''}
      </Text>
      {expanded && <ChallengeStandings standings={result.standings} />}
      <YStack gap={8}>
        <DuncitButton
          variant="ghost"
          size="sm"
          label={t(expanded ? 'mweb.challenge.hideLeaderboard' : 'mweb.challenge.showLeaderboard')}
          onPress={() => setExpanded((v) => !v)}
          testID={`challenge-result-toggle-${challenge.id}`}
        />
        {onView && (
          <DuncitButton
            variant="outline"
            size="sm"
            label={t('mweb.challenge.viewResults')}
            onPress={onView}
            testID={`challenge-result-view-${challenge.id}`}
          />
        )}
        <DuncitButton
          variant="ghost"
          size="sm"
          label={t('mweb.challenge.share')}
          onPress={() =>
            fireAndForget(shareChallenge(challenge.pod_id, challenge.id, challenge.name))
          }
          testID={`challenge-result-share-${challenge.id}`}
        />
      </YStack>
    </SurfaceCard>
  );
}
