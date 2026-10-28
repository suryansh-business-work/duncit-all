import { Chip, CircularProgress } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { isLiveRun, type StressRunStatus } from '../queries';
import { environmentColor, environmentLabel, statusColor, statusLabel } from '../labels';

/** A run's status — spinning while it is live, so a table reads "still going" at a glance. */
export function RunStatusChip({ status }: Readonly<{ status: StressRunStatus }>) {
  const { t } = useTranslation();
  const live = isLiveRun(status);
  return (
    <Chip
      size="small"
      color={statusColor(status)}
      variant={live ? 'outlined' : 'filled'}
      icon={live ? <CircularProgress size={12} thickness={6} color="inherit" /> : undefined}
      label={statusLabel(t, status)}
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
