import { Text, XStack, YStack } from 'tamagui';
import {
  answerCount,
  buzzOrder,
  challengeQuestions,
  openQuestion,
  pickedCompetitors,
  toolsFedBy,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  challenge: Pick<PodChallengeView, 'status' | 'tools' | 'competitors'>;
  actions: HostChallengeActions;
}

/**
 * The quiz desk, the buzzer and the random picker — the Tamagui twin of mWeb's
 * HostQuizControl + HostRunControls (rule 27). One question is open at a time;
 * arming starts a fresh buzz round; a pick is drawn by the server, never here.
 */
export function HostChallengeTools({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const live = challenge.status === 'LIVE';
  const names = new Map(challenge.competitors.map((c) => [c.competitor_id, c.name]));

  return (
    <>
      {toolsFedBy(challenge.tools, 'QUIZ').map((tool) => {
        const open = tool.voting_open ? openQuestion(tool)?.key : undefined;
        return (
          <YStack key={tool.instance_id} gap={8} aria-label={tool.label}>
            <Text fontSize={14} fontWeight="700" color="$color" role="heading">
              {tool.label}
            </Text>
            {challengeQuestions(tool).map((question) => (
              <XStack key={question.key} alignItems="center" gap={8}>
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="600" color="$color">
                    {question.label}
                  </Text>
                  <Text fontSize={12} color="$muted">
                    {t('mweb.challenge.tools.quizDesk', {
                      vars: {
                        answer:
                          question.correct === null
                            ? ''
                            : (question.options[question.correct] ?? ''),
                        count: answerCount(tool, question.key),
                      },
                    })}
                  </Text>
                </YStack>
                {open === question.key ? (
                  <DuncitButton
                    size="sm"
                    variant="outline"
                    disabled={actions.busy}
                    label={t('mweb.challenge.tools.quizClose')}
                    onPress={() => fireAndForget(actions.quiz(tool.instance_id, null))}
                    testID={`challenge-quiz-close-${question.key}`}
                  />
                ) : (
                  <DuncitButton
                    size="sm"
                    disabled={!live || actions.busy}
                    label={t('mweb.challenge.tools.quizOpen')}
                    onPress={() => fireAndForget(actions.quiz(tool.instance_id, question.key))}
                    testID={`challenge-quiz-open-${question.key}`}
                  />
                )}
              </XStack>
            ))}
          </YStack>
        );
      })}
      {toolsFedBy(challenge.tools, 'BUZZ').map((tool) => {
        const first = buzzOrder(tool)[0];
        return (
          <YStack key={tool.instance_id} gap={8}>
            <Text fontSize={14} color="$color" aria-live="polite">
              {tool.label} ·{' '}
              {first
                ? t('mweb.challenge.tools.buzzFirst', { vars: { name: names.get(first) ?? '' } })
                : t('mweb.challenge.tools.buzzNobody')}
            </Text>
            <XStack gap={8} flexWrap="wrap">
              <DuncitButton
                size="sm"
                disabled={!live || actions.busy}
                label={t(
                  tool.voting_open
                    ? 'mweb.challenge.tools.buzzerNext'
                    : 'mweb.challenge.tools.buzzerArm',
                )}
                onPress={() => fireAndForget(actions.buzzer(tool.instance_id, true))}
                testID={`challenge-buzzer-arm-${tool.instance_id}`}
              />
              <DuncitButton
                size="sm"
                variant="outline"
                disabled={!tool.voting_open || actions.busy}
                label={t('mweb.challenge.tools.buzzerDisarm')}
                onPress={() => fireAndForget(actions.buzzer(tool.instance_id, false))}
                testID={`challenge-buzzer-disarm-${tool.instance_id}`}
              />
            </XStack>
          </YStack>
        );
      })}
      {toolsFedBy(challenge.tools, 'PICK').map((tool) => {
        const picked = pickedCompetitors(tool);
        const latest = picked.at(-1);
        return (
          <YStack key={tool.instance_id} gap={8}>
            <Text fontSize={14} color="$color" aria-live="polite">
              {tool.label} ·{' '}
              {latest
                ? t('mweb.challenge.tools.pickLatest', { vars: { name: names.get(latest) ?? '' } })
                : t('mweb.challenge.tools.pickNone')}
            </Text>
            <XStack gap={8} flexWrap="wrap">
              <DuncitButton
                size="sm"
                disabled={actions.busy}
                label={t('mweb.challenge.tools.pick')}
                onPress={() => fireAndForget(actions.pick(tool.instance_id, false))}
                testID={`challenge-pick-draw-${tool.instance_id}`}
              />
              <DuncitButton
                size="sm"
                variant="ghost"
                disabled={!picked.length || actions.busy}
                label={t('mweb.challenge.tools.pickReset')}
                onPress={() => fireAndForget(actions.pick(tool.instance_id, true))}
                testID={`challenge-pick-reset-${tool.instance_id}`}
              />
            </XStack>
          </YStack>
        );
      })}
    </>
  );
}
