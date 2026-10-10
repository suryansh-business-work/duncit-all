import { LinearProgress, Stack, Typography } from '@mui/material';
import PollIcon from '@mui/icons-material/Poll';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { pollResults } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PanelProps } from './ChallengeToolPanels';
import ToolCard, { ToolNote } from './ToolCard';

/**
 * A poll: every option with its live tally. An attendee votes while the host
 * has it open; a second tap moves their vote (the server keeps one per person).
 */
export default function ChallengePollPanel({ challenge, tool, actions, interactive }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const mine = challenge.viewer.my_votes.find((v) => v.tool_instance_id === tool.instance_id && v.kind === 'POLL')?.candidate_id;
  const canVote = interactive && challenge.viewer.can_interact && tool.voting_open;

  return (
    <ToolCard icon={<PollIcon color="primary" />} title={tool.label}>
      {pollResults(tool).map((option) => (
        <Stack key={option.key} spacing={0.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            {canVote ? (
              <DuncitButton
                size="small"
                variant={mine === option.key ? 'contained' : 'outlined'}
                aria-pressed={mine === option.key}
                disabled={actions.busy}
                onClick={() => fireAndForget(actions.poll(tool.instance_id, option.key), logs.mWeb, 'pod-challenge', 'poll')}
              >
                {option.label}
              </DuncitButton>
            ) : (
              <Typography variant="body2" sx={{ fontWeight: mine === option.key ? 700 : 400 }}>
                {option.label}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              {t('mweb.challenge.tools.pollTally', { vars: { percent: option.percent, votes: option.votes } })}
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={option.percent} aria-label={option.label} />
        </Stack>
      ))}
      {!tool.voting_open && <ToolNote>{t('mweb.challenge.votingClosed', { vars: { label: tool.label } })}</ToolNote>}
    </ToolCard>
  );
}
