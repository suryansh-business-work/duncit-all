import { Chip, Stack, Typography } from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { openQuestion } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PanelProps } from './ChallengeToolPanels';
import ToolCard, { ToolNote } from './ToolCard';

/**
 * The quiz question the host has open. A competitor answers once — the first
 * answer stands, so nobody changes theirs after seeing the room. The correct
 * answer never reaches a player's device; the points show up on the board.
 */
export default function ChallengeQuizPanel({ challenge, tool, actions, interactive }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const question = openQuestion(tool);
  const icon = <QuizIcon color="primary" />;
  if (!question) {
    return (
      <ToolCard icon={icon} title={tool.label}>
        <ToolNote>{t('mweb.challenge.tools.quizWaiting')}</ToolNote>
      </ToolCard>
    );
  }
  const mine = challenge.viewer.my_votes.find(
    (v) => v.tool_instance_id === tool.instance_id && v.kind === 'ANSWER' && v.scope_key === question.key
  );
  const competing = !!challenge.viewer.my_competitor_id;
  const canAnswer = interactive && competing && tool.voting_open && !mine;

  return (
    <ToolCard icon={icon} title={tool.label}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h4" sx={{ fontWeight: 700 }}>
          {question.label}
        </Typography>
        <Chip size="small" variant="outlined" label={t('mweb.challenge.score', { vars: { score: question.points } })} />
      </Stack>
      {question.options.map((option, index) => (
        <DuncitButton
          key={`${question.key}-${option}`}
          variant={mine?.value === index ? 'contained' : 'outlined'}
          aria-pressed={mine?.value === index}
          disabled={!canAnswer || actions.busy}
          onClick={() => fireAndForget(actions.answer(tool.instance_id, index), logs.mWeb, 'pod-challenge', 'quiz')}
        >
          {option}
        </DuncitButton>
      ))}
      {mine && <ToolNote>{t('mweb.challenge.tools.quizAnswered')}</ToolNote>}
      {!mine && !tool.voting_open && <ToolNote>{t('mweb.challenge.tools.quizClosed')}</ToolNote>}
      {interactive && !competing && <ToolNote>{t('mweb.challenge.tools.competitorsOnly')}</ToolNote>}
    </ToolCard>
  );
}
