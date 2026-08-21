import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Stack } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { CONTENT_REPORTS_TABLE, type ContentReport } from '../../graphql/reports';
import UserReportsTable from './UserReportsTable';
import ReportDetailDialog from './ReportDetailDialog';

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

  return (
    <Stack spacing={2}>
      <PageHeader title={t('reportLogs.title')} subtitle={t('reportLogs.subtitle')} />

      <UserReportsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        onOpen={setOpen}
      />

      <ReportDetailDialog
        report={open}
        formatDateTime={formatDateTime}
        onClose={() => setOpen(null)}
        onSaved={() => {
          notifySuccess(t('reportLogs.saved'));
          refetchRef.current?.();
        }}
      />
    </Stack>
  );
}
