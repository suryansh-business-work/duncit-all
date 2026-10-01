import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { REPORT_ACTION_KEY, REPORT_STATUS_KEY, type ReportStatus } from '@duncit/utils';
import type { ContentReportAction } from '../../../graphql/reports';

interface Props {
  history: ContentReportAction[];
  formatDateTime: (value: Date) => string;
}

/**
 * Everything reviewers did about one report, newest first.
 *
 * It exists so "did we tell them?" and "who took this down, and why?" are
 * answered by the report itself. A mail's line carries the subject and the
 * message that was sent, because that is what gets asked for when a take-down
 * is disputed.
 */
export default function ReportHistory({ history, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const newestFirst = [...history].sort((a, b) => b.at.localeCompare(a.at));
  // A status change logs the status it moved to, which is an enum the server
  // stores — every other note is a reviewer's own words and is shown as typed.
  const noteOf = (entry: ContentReportAction) => {
    const statusKey = REPORT_STATUS_KEY[entry.note as ReportStatus];
    return entry.action === 'STATUS_CHANGED' && statusKey ? t(statusKey) : entry.note;
  };

  return (
    <Box data-testid="report-history">
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {t('reportLogs.detailHistory')}
      </Typography>
      {newestFirst.length === 0 ? (
        <Typography data-testid="report-history-empty" variant="body2" sx={{ color: 'text.secondary' }}>
          {t('reportLogs.detailNoHistory')}
        </Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {newestFirst.map((entry) => (
            <Box component="li" key={entry.id} data-testid={`report-history-${entry.id}`}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t(REPORT_ACTION_KEY[entry.action])}
              </Typography>
              <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                {t('reportLogs.detailHistoryBy', {
                  vars: { name: entry.by_name || '—', when: formatDateTime(new Date(entry.at)) },
                })}
              </Typography>
              {entry.note && (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                  {noteOf(entry)}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
