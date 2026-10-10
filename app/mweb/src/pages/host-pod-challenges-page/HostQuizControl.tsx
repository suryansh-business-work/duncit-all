import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { answerCount, challengeQuestions, openQuestion, toolsFedBy } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import type { HostChallengeActions } from './useHostChallengeActions';

interface Props {
  challenge: Pick<PodChallengeView, 'status' | 'tools'>;
  actions: HostChallengeActions;
}

/**
 * The quiz desk: open one question at a time, watch the answers come in, close
 * it. Only the host's copy of the questions carries the correct answer; points
 * are worked out by the server and land on the board.
 */
export default function HostQuizControl({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const live = challenge.status === 'LIVE';
  const go = (job: Promise<boolean>) => fireAndForget(job, logs.mWeb, 'host-pod-challenges', 'quiz');

  return (
    <>
      {toolsFedBy(challenge.tools, 'QUIZ').map((tool) => {
        const open = tool.voting_open ? openQuestion(tool)?.key : undefined;
        return (
          <Stack key={tool.instance_id} spacing={1} component="section" aria-label={tool.label}>
            <Typography variant="subtitle2" component="h4">
              {tool.label}
            </Typography>
            {challengeQuestions(tool).map((question) => (
              <Stack key={question.key} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {question.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('mweb.challenge.tools.quizDesk', {
                      vars: {
                        answer: question.correct === null ? '' : (question.options[question.correct] ?? ''),
                        count: answerCount(tool, question.key),
                      },
                    })}
                  </Typography>
                </Stack>
                {open === question.key ? (
                  <DuncitButton size="small" variant="outlined" disabled={actions.busy} onClick={() => go(actions.quiz(tool.instance_id, null))}>
                    {t('mweb.challenge.tools.quizClose')}
                  </DuncitButton>
                ) : (
                  <DuncitButton size="small" variant="contained" disabled={!live || actions.busy} onClick={() => go(actions.quiz(tool.instance_id, question.key))}>
                    {t('mweb.challenge.tools.quizOpen')}
                  </DuncitButton>
                )}
              </Stack>
            ))}
          </Stack>
        );
      })}
    </>
  );
}
