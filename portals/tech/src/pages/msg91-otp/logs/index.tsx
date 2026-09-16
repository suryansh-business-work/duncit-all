import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import Msg91PageFrame from '../Msg91PageFrame';
import { LOGS_MAX_DAYS, MSG91_WIDGET_LOGS } from '../queries';
import { useMsg91Report } from '../useMsg91Report';
import LogsTable from './LogsTable';

/**
 * Tech → MSG91 OTP Logs → Logs: every OTP widget request MSG91 recorded,
 * read live from MSG91 for a window of up to three days.
 */
export default function Msg91LogsPage() {
  const { t } = useTranslation();
  const report = useMsg91Report(MSG91_WIDGET_LOGS, LOGS_MAX_DAYS);
  const page = report.data?.msg91WidgetLogs;
  const rows = page?.rows ?? [];
  // MSG91 pages its log; say so when this window holds more than came back.
  const partial = page && page.total > rows.length;

  return (
    <Msg91PageFrame
      title={t('tech.msg91.logsTitle')}
      subtitle={t('tech.msg91.logsSubtitle')}
      range={report.range}
      maxDays={LOGS_MAX_DAYS}
      loading={report.loading}
      error={report.error}
      onRange={report.onRange}
    >
      {partial ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('tech.msg91.showingOf', { vars: { shown: rows.length, total: page.total } })}
        </Typography>
      ) : null}
      <LogsTable rows={rows} />
    </Msg91PageFrame>
  );
}
