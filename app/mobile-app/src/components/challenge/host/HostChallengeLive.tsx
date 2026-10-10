import { Text, XStack, YStack } from 'tamagui';
import { parseJsonObject } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ChallengeClock } from '@/components/challenge/ChallengeClock';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ValueEntry } from './ValueEntry';

type Tool = PodChallengeView['tools'][number];

interface Props {
  challenge: PodChallengeView;
  receivedAt: number;
  actions: HostChallengeActions;
}

/**
 * Clocks, vote windows, rounds and live score entry — the Tamagui twin of
 * mWeb's HostLiveControls + HostScorePad (rule 27). How each tool is fed comes
 * from the server (`input_kind`), and the value shown beside a competitor is
 * the server's metric, never a client sum.
 */
export function HostChallengeLive({ challenge, receivedAt, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const live = challenge.status === 'LIVE';
  const metrics = new Map(
    challenge.standings.map((s) => [s.competitor_id, parseJsonObject(s.metrics_json)]),
  );
  const rounds = challenge.tools.find((tool) => tool.input_kind === 'ROUND');
  const totalRounds = rounds ? Number(parseJsonObject(rounds.config_json).rounds ?? 1) : 0;
  const scorable = challenge.tools.filter(
    (tool) =>
      tool.input_kind === 'INCREMENT' ||
      tool.input_kind === 'SET_VALUE' ||
      (tool.input_kind === 'CLOCK' &&
        parseJsonObject(tool.config_json).record_competitor_times === true),
  );
  const stepsOf = (tool: Tool) => {
    const settings = parseJsonObject(tool.config_json);
    return ((settings.increments as number[] | undefined) ?? []).flatMap((s) =>
      settings.allow_negative ? [s, -s] : [s],
    );
  };

  return (
    <YStack gap={16}>
      {challenge.tools
        .filter((tool) => tool.input_kind === 'CLOCK')
        .map((tool) => (
          <YStack key={tool.instance_id} gap={8}>
            <ChallengeClock tool={tool} receivedAt={receivedAt} />
            <XStack gap={8} flexWrap="wrap">
              <DuncitButton
                size="sm"
                disabled={!live || tool.clock_running || actions.busy}
                label={t('mweb.challenge.clockStart')}
                onPress={() => fireAndForget(actions.clock(tool.instance_id, 'START'))}
                testID={`challenge-clock-start-${tool.instance_id}`}
              />
              <DuncitButton
                size="sm"
                variant="outline"
                disabled={!tool.clock_running || actions.busy}
                label={t('mweb.challenge.clockStop')}
                onPress={() => fireAndForget(actions.clock(tool.instance_id, 'STOP'))}
                testID={`challenge-clock-stop-${tool.instance_id}`}
              />
              <DuncitButton
                size="sm"
                variant="ghost"
                disabled={tool.clock_running || actions.busy}
                label={t('mweb.challenge.clockReset')}
                onPress={() => fireAndForget(actions.clock(tool.instance_id, 'RESET'))}
                testID={`challenge-clock-reset-${tool.instance_id}`}
              />
            </XStack>
          </YStack>
        ))}
      {challenge.tools
        .filter((tool) => tool.input_kind === 'VOTE' || tool.input_kind === 'RATE')
        .map((tool) => (
          <XStack key={tool.instance_id} alignItems="center" gap={8}>
            <Text flex={1} fontSize={14} color="$color">
              {tool.label} ·{' '}
              {t(
                tool.voting_open ? 'mweb.challenge.votingOpen' : 'mweb.challenge.votingClosedShort',
              )}
            </Text>
            <DuncitButton
              size="sm"
              variant={tool.voting_open ? 'outline' : 'solid'}
              disabled={actions.busy || (!tool.voting_open && !live)}
              label={t(
                tool.voting_open ? 'mweb.challenge.closeVoting' : 'mweb.challenge.openVoting',
              )}
              onPress={() => fireAndForget(actions.voting(tool.instance_id, !tool.voting_open))}
              testID={`challenge-voting-${tool.instance_id}`}
            />
          </XStack>
        ))}
      {totalRounds > 0 && (
        <XStack alignItems="center" gap={8}>
          <DuncitButton
            size="sm"
            variant="outline"
            disabled={actions.busy || challenge.current_round <= 1}
            label={t('mweb.challenge.previousRound')}
            onPress={() => fireAndForget(actions.round(challenge.current_round - 1))}
            testID="challenge-round-prev"
          />
          <Text fontSize={14} fontWeight="700" color="$color">
            {t('mweb.challenge.roundOf', {
              vars: { round: challenge.current_round, total: totalRounds },
            })}
          </Text>
          <DuncitButton
            size="sm"
            variant="outline"
            disabled={actions.busy || challenge.current_round >= totalRounds}
            label={t('mweb.challenge.nextRound')}
            onPress={() => fireAndForget(actions.round(challenge.current_round + 1))}
            testID="challenge-round-next"
          />
        </XStack>
      )}
      {live &&
        scorable.map((tool) => (
          <YStack key={tool.instance_id} gap={8} aria-label={tool.label}>
            <Text fontSize={14} fontWeight="700" color="$color" role="heading">
              {tool.label}
            </Text>
            {challenge.competitors.map((c) => (
              <YStack key={c.competitor_id} gap={6}>
                <Text fontSize={14} fontWeight="600" color="$color">
                  {c.name} · {String(metrics.get(c.competitor_id)?.[tool.instance_id] ?? '—')}
                </Text>
                {tool.input_kind === 'INCREMENT' ? (
                  <XStack gap={6} flexWrap="wrap">
                    {stepsOf(tool).map((step) => (
                      <DuncitButton
                        key={step}
                        size="sm"
                        variant={step > 0 ? 'solid' : 'outline'}
                        disabled={actions.busy}
                        label={step > 0 ? `+${step}` : String(step)}
                        onPress={() =>
                          fireAndForget(actions.score(tool.instance_id, c.competitor_id, step))
                        }
                        testID={`challenge-score-${tool.instance_id}-${c.competitor_id}-${step}`}
                      />
                    ))}
                  </XStack>
                ) : (
                  <ValueEntry tool={tool} competitorId={c.competitor_id} actions={actions} />
                )}
              </YStack>
            ))}
          </YStack>
        ))}
    </YStack>
  );
}
