import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useQuery } from '@apollo/client/react';
import { Button, Stack } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { CONTENT_REPORT_REASON_OPTIONS, CONTENT_REPORTS_TABLE, type ContentReport } from '../../graphql/reports';
import UserReportsTable from './UserReportsTable';
import ReportDetailDialog from './ReportDetailDialog';
import ReportReasonSettingsDialog from './ReportReasonSettingsDialog';

/**
 * Legal > Report By User — everything users have reported, from every surface.
 *
 * One queue rather than one per content type: a report is a report, and a
 * reviewer should not have to know which screen it came from to find it.
 */
export default function UserReportsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  // Admin-configured format and time zone, so "Received" reads the same here
  // as it does everywhere else in the platform.
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });

  const fetchRows = useApolloTableFetch<ContentReport>(
    client,
    CONTENT_REPORTS_TABLE,
    'contentReportsTable',
  );

  const [open, setOpen] = useState<ContentReport | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: reasonData, refetch: refetchReasons } = useQuery(CONTENT_REPORT_REASON_OPTIONS);
  const reasonOptions = reasonData?.contentReportReasonOptions ?? [];

  return (
    <Stack spacing={2}>
      <PageHeader title={t('reportLogs.title')} subtitle={t('reportLogs.subtitle')} />
      <Button startIcon={<SettingsIcon />} onClick={() => setSettingsOpen(true)} sx={{ alignSelf: 'flex-end' }}>
        {t('reportLogs.settings')}
      </Button>

      <UserReportsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        onOpen={setOpen}
        reasonOptions={reasonOptions}
      />

      <ReportDetailDialog
        report={open}
        reasonOptions={reasonOptions}
        formatDateTime={formatDateTime}
        onClose={() => setOpen(null)}
        onSaved={() => {
          notifySuccess(t('reportLogs.saved'));
          refetchRef.current?.();
        }}
      />
      <ReportReasonSettingsDialog open={settingsOpen} onClose={() => { setSettingsOpen(false); refetchReasons(); }} />
    </Stack>
  );
}
