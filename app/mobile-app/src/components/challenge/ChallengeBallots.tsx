import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { parseJsonObject } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { MediumToggle } from '@/components/attendance/AttendanceOtpControls';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import {
  CastPodChallengeVoteDocument,
  RatePodChallengeCompetitorDocument,
} from '@/graphql/challenges';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'competitors' | 'viewer'>;
  tool: PodChallengeView['tools'][number];
  onChanged: (next: PodChallengeView) => void;
}

/**
 * Audience participation for one Voting or Rating tool — the Tamagui twin of
 * mWeb's ChallengeBallotPanel (rule 27). The server re-checks every ballot
 * (attendee, live, voting open) and keeps one per person: a second tap changes
 * the ballot instead of adding one.
 */
export function ChallengeBallots({ challenge, tool, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mine = challenge.viewer.my_votes.filter((v) => v.tool_instance_id === tool.instance_id);
  const scaleMax = Number(parseJsonObject(tool.config_json).scale_max ?? 5);
  const base = { id: challenge.id, toolInstanceId: tool.instance_id };

  const run = async (job: () => Promise<PodChallengeView>) => {
    setBusy(true);
    try {
      onChanged(await job());
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const vote = (candidateId: string) =>
    run(
      async () =>
        (
          await graphqlRequest(
            CastPodChallengeVoteDocument,
            { ...base, candidateId },
            { auth: true },
          )
        ).castPodChallengeVote,
    );
  const rate = (candidateId: string, value: number) =>
    run(
      async () =>
        (
          await graphqlRequest(
            RatePodChallengeCompetitorDocument,
            { ...base, candidateId, value },
            { auth: true },
          )
        ).ratePodChallengeCompetitor,
    );

  if (!tool.voting_open) {
    return (
      <Text fontSize={14} color="$muted">
        {t('mweb.challenge.votingClosed', { vars: { label: tool.label } })}
      </Text>
    );
  }
  return (
    <SurfaceCard gap={10} testID={`challenge-ballot-${tool.instance_id}`}>
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="how-to-vote" size={20} color={colors.primary} />
        <Text fontSize={16} fontWeight="700" color="$color" role="heading">
          {tool.label}
        </Text>
      </XStack>
      {error ? <NoticeCard tone="danger" title={error} /> : null}
      {challenge.competitors.map((c) => {
        const chosen = mine.find((v) => v.candidate_id === c.competitor_id);
        if (tool.input_kind === 'VOTE') {
          return (
            <DuncitButton
              key={c.competitor_id}
              variant={chosen ? 'solid' : 'outline'}
              disabled={busy}
              label={t(chosen ? 'mweb.challenge.votedFor' : 'mweb.challenge.voteFor', {
                vars: { name: c.name },
              })}
              onPress={() => fireAndForget(vote(c.competitor_id))}
              testID={`challenge-vote-${c.competitor_id}`}
              fullWidth
            />
          );
        }
        return (
          <YStack key={c.competitor_id} gap={6}>
            <Text fontSize={14} fontWeight="600" color="$color">
              {c.name}
            </Text>
            <XStack gap={6} flexWrap="wrap" role="radiogroup" aria-label={c.name}>
              {Array.from({ length: scaleMax }, (_, i) => i + 1).map((value) => (
                <MediumToggle
                  key={value}
                  label={String(value)}
                  selected={chosen?.value === value}
                  onPress={() => {
                    if (!busy) fireAndForget(rate(c.competitor_id, value));
                  }}
                />
              ))}
            </XStack>
          </YStack>
        );
      })}
    </SurfaceCard>
  );
}
