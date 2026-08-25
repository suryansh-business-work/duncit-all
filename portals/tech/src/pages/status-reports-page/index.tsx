import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import StatusReportsTable from './StatusReportsTable';
import StatusReportDetailDialog from './StatusReportDetailDialog';
import { STATUS_REPORTS_TABLE, type StatusReportRow } from './queries';

/**
 * Status Reports — what people typed into the form on status.duncit.com.
 *
 * The probes on that page answer whether a host returns an HTTP status, and
 * most outages never move that needle: a sign-in that loops, a page that
 * renders empty, a payment that hangs. Those only ever arrive as a sentence
 * from the person hitting them, and this is where they land.
 */
export default function StatusReportsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<StatusReportRow | null>(null);
  const fetchRows = useApolloTableFetch<StatusReportRow>(
    client,
    STATUS_REPORTS_TABLE,
    'statusReportsTable'
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">{t('tech.statusReports.title')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('tech.statusReports.intro')}
        </Typography>
      </Box>
      <StatusReportsTable fetchRows={fetchRows} refetchRef={refetchRef} onOpen={setSelected} />
      <StatusReportDetailDialog
        row={selected}
        onClose={() => setSelected(null)}
        onSaved={() => refetchRef.current?.()}
      />
    </Stack>
  );
}
