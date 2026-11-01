import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { DuncitButton } from '@duncit/buttons';
import { HelpTip } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import RunStatusChip from '../activity-page/RunStatusChip';
import { AGENT_RUNS_PATH } from './copy';
import type { MarketingAgent } from './queries';

interface Props {
  agent: MarketingAgent;
  busy: boolean;
  /** Run now — absent for a person who may only read. */
  onRun?: () => void;
}

/** How the last run ended, when the next one is booked, and the button to run it now. */
export default function AgentRunStatus({ agent, busy, onRun }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const next = agent.enabled && agent.next_run_at ? formatDateTime(agent.next_run_at) : t('marketing.agents.nextRunOff');

  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 3, alignItems: 'flex-end' }} data-tour="agent-run" data-testid={`agent-run-status-${agent.key}`}>
      <Stack spacing={0.5}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('marketing.agents.lastRun')}
          <HelpTip title={t('marketing.agents.lastRunHint')} />
        </Typography>
        <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          {agent.last_run_status ? (
            <RunStatusChip status={agent.last_run_status} />
          ) : (
            <Typography variant="body2" data-testid="agent-last-run-never">
              {t('marketing.agents.lastRunNever')}
            </Typography>
          )}
          {agent.last_run_at && (
            <Typography variant="body2" data-testid="agent-last-run-at">
              {formatDateTime(agent.last_run_at)}
            </Typography>
          )}
          {agent.last_run_id && (
            <Link component={RouterLink} to={AGENT_RUNS_PATH} variant="body2" data-testid="agent-open-last-run">
              {t('marketing.agents.openLastRun')}
            </Link>
          )}
        </Stack>
      </Stack>
      <Stack spacing={0.5}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('marketing.agents.nextRun')}
          <HelpTip title={t('marketing.agents.nextRunHint')} />
        </Typography>
        <Typography variant="body2" data-testid="agent-next-run">
          {next}
        </Typography>
      </Stack>
      {onRun && (
        <DuncitButton variant="outlined" size="small" startIcon={<PlayArrowIcon />} onClick={onRun} disabled={busy} data-testid="agent-run-now">
          {t('marketing.agents.runNow')}
        </DuncitButton>
      )}
    </Stack>
  );
}
