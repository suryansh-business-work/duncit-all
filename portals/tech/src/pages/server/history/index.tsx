import { Alert, CircularProgress, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import SectionCard from '../../stress-testing/components/SectionCard';
import HistoryCharts from './HistoryCharts';
import HistorySummary from './HistorySummary';
import { useServerHistory } from './useServerHistory';

/** Tech > Server > Info's month: the summary tiles over six per-day charts. */
export default function ServerHistoryPanel() {
  const { t } = useTranslation();
  const { history, loading, error } = useServerHistory();

  let body = null;
  if (history) {
    body = (
      <Stack spacing={2}>
        <HistorySummary summary={history.summary} periodDays={history.days.length} />
        <HistoryCharts days={history.days} />
      </Stack>
    );
  } else if (loading) {
    body = (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <SectionCard
      title={t('tech.server.historyTitle')}
      subtitle={t('tech.server.historySubtitle', { vars: { zone: history?.timeZone ?? '' } })}
    >
      <Stack spacing={2}>
        {error && (
          <Alert severity="error">{t('tech.server.historyError', { vars: { message: error.message } })}</Alert>
        )}
        {body}
      </Stack>
    </SectionCard>
  );
}
