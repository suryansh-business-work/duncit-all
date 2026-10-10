import { Text, XStack, YStack } from 'tamagui';
import { pollResults } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ProgressBar, ToolCard, ToolNote, type PanelProps } from './ToolCard';

/**
 * A poll: every option with its live tally — the Tamagui twin of mWeb's
 * ChallengePollPanel (rule 27). An attendee votes while the host has it open;
 * a second tap moves their vote (the server keeps one per person).
 */
export function PollPanel({ challenge, tool, actions }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const mine = challenge.viewer.my_votes.find(
    (v) => v.tool_instance_id === tool.instance_id && v.kind === 'POLL',
  )?.candidate_id;
  const canVote = challenge.viewer.can_interact && tool.voting_open;

  return (
    <ToolCard icon="poll" title={tool.label} testID={`challenge-poll-${tool.instance_id}`}>
      {pollResults(tool).map((option) => (
        <YStack key={option.key} gap={6}>
          <XStack alignItems="center" gap={8}>
            <YStack flex={1}>
              {canVote ? (
                <DuncitButton
                  size="sm"
                  variant={mine === option.key ? 'solid' : 'outline'}
                  disabled={actions.busy}
                  label={option.label}
                  onPress={() => fireAndForget(actions.poll(tool.instance_id, option.key))}
                  testID={`challenge-poll-${tool.instance_id}-${option.key}`}
                />
              ) : (
                <Text fontSize={14} fontWeight={mine === option.key ? '700' : '400'} color="$color">
                  {option.label}
                </Text>
              )}
            </YStack>
            <Text fontSize={13} color="$muted">
              {t('mweb.challenge.tools.pollTally', {
                vars: { percent: option.percent, votes: option.votes },
              })}
            </Text>
          </XStack>
          <ProgressBar percent={option.percent} />
        </YStack>
      ))}
      {!tool.voting_open && (
        <ToolNote>{t('mweb.challenge.votingClosed', { vars: { label: tool.label } })}</ToolNote>
      )}
    </ToolCard>
  );
}
