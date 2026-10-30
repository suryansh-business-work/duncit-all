import { Chip } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { useLiveChip } from '../../../components/live-runs/useLiveChip';
import { isLiveRun, type StressRunStatus } from '../queries';
import { environmentColor, environmentLabel, statusColor, statusLabel } from '../labels';

/**
 * A run's status — while it is live, a ring that fills with the run's progress
 * against its own plan, so a table reads "still going, and how far" at a glance.
 */
export function RunStatusChip({ status, runId }: Readonly<{ status: StressRunStatus; runId: string }>) {
  const { t } = useTranslation();
  const live = isLiveRun(status);
  const label = statusLabel(t, status);
  const liveChip = useLiveChip('STRESS', live ? runId : null, label);
  return (
    <Chip
      size="small"
      color={statusColor(status)}
      variant={live ? 'outlined' : 'filled'}
      icon={live ? liveChip.icon : undefined}
      label={live ? liveChip.label : label}
    />
  );
}

/** Which environment the run hit — red for production, so it is never mistaken. */
export function EnvironmentChip({ environment }: Readonly<{ environment: string }>) {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      variant="outlined"
      color={environmentColor(environment)}
      label={environmentLabel(t, environment)}
    />
  );
}
