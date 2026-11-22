import { Alert, Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import RangeSelect from '../ai-features/RangeSelect';
import { OVERVIEW_POLL_MS, type OverviewDashboard } from './queries';

interface Props {
  rangeDays: number;
  onRangeChange: (days: number) => void;
  /** The last answer, kept on screen while a refresh is out or after one failed. */
  dashboard: OverviewDashboard | undefined;
  failed: boolean;
  onRetry: () => void;
}

/**
 * Title, range, when the figures were read, and the notices that change how
 * they read: a failed load (with Retry), a range with no calls, and costs that
 * are a minimum because a model has no rate.
 */
export default function OverviewHeader({ rangeDays, onRangeChange, dashboard, failed, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  const retry = (
    <DuncitButton color="inherit" size="small" onClick={onRetry}>
      {t('shell.common.retry')}
    </DuncitButton>
  );
  const readAt = dashboard ? formatDateTime(dashboard.generated_at) : '';

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {t('ai.overview.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('ai.overview.subtitle')}
          </Typography>
          {dashboard && (
            <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
              {t('ai.overview.updated', { vars: { when: readAt, seconds: OVERVIEW_POLL_MS / 1000 } })}
            </Typography>
          )}
        </Box>
        <RangeSelect value={rangeDays} onChange={onRangeChange} />
      </Stack>
      {failed && (
        <Alert severity={dashboard ? 'warning' : 'error'} action={retry}>
          {dashboard ? t('ai.overview.refreshFailed', { vars: { when: readAt } }) : t('ai.overview.loadFailed')}
        </Alert>
      )}
      {dashboard && dashboard.totals.calls === 0 && <Alert severity="info">{t('ai.overview.empty')}</Alert>}
      {dashboard && dashboard.totals.unpriced_calls > 0 && (
        <Alert severity="warning">
          {t('ai.overview.unpriced', { vars: { count: dashboard.totals.unpriced_calls } })}
        </Alert>
      )}
    </Stack>
  );
}
