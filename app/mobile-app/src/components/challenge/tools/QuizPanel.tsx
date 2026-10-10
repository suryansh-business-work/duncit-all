import { Text, XStack } from 'tamagui';
import { openQuestion } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ToolCard, ToolNote, type PanelProps } from './ToolCard';

/**
 * The quiz question the host has open — the Tamagui twin of mWeb's
 * ChallengeQuizPanel (rule 27). A competitor answers once: the first answer
 * stands. The correct answer never reaches a player's device; the points show
 * up on the board.
 */
export function QuizPanel({ challenge, tool, actions }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const question = openQuestion(tool);
  const testID = `challenge-quiz-${tool.instance_id}`;
  if (!question) {
    return (
      <ToolCard icon="quiz" title={tool.label} testID={testID}>
        <ToolNote>{t('mweb.challenge.tools.quizWaiting')}</ToolNote>
      </ToolCard>
    );
  }
  const mine = challenge.viewer.my_votes.find(
    (v) =>
      v.tool_instance_id === tool.instance_id &&
      v.kind === 'ANSWER' &&
      v.scope_key === question.key,
  );
  const competing = !!challenge.viewer.my_competitor_id;
  const canAnswer = competing && tool.voting_open && !mine;

  return (
    <ToolCard icon="quiz" title={tool.label} testID={testID}>
      <XStack alignItems="flex-start" gap={8}>
        <Text flex={1} fontSize={17} fontWeight="700" color="$color">
          {question.label}
        </Text>
        <Text fontSize={13} color="$muted">
          {t('mweb.challenge.score', { vars: { score: question.points } })}
        </Text>
      </XStack>
      {question.options.map((option, index) => (
        <DuncitButton
          key={`${question.key}-${option}`}
          variant={mine?.value === index ? 'solid' : 'outline'}
          disabled={!canAnswer || actions.busy}
          label={option}
          onPress={() => fireAndForget(actions.answer(tool.instance_id, index))}
          testID={`${testID}-${index}`}
          fullWidth
        />
      ))}
      {mine ? <ToolNote>{t('mweb.challenge.tools.quizAnswered')}</ToolNote> : null}
      {!mine && !tool.voting_open ? (
        <ToolNote>{t('mweb.challenge.tools.quizClosed')}</ToolNote>
      ) : null}
      {competing ? null : <ToolNote>{t('mweb.challenge.tools.competitorsOnly')}</ToolNote>}
    </ToolCard>
  );
}
