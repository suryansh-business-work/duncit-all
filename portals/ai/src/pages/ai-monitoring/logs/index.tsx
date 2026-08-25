import { useCallback, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { useApolloTableFetch } from '@duncit/table';
import MonitoringLogsTable from './MonitoringLogsTable';
import MonitoringLogDrawer from './MonitoringLogDrawer';
import { AI_MONITORING_LOGS_TABLE, type MonitoringLogRow } from '../queries';

/**
 * AI Monitoring > Logs — every image the platform screened.
 *
 * One row per check, including the ones that never reached OpenAI. A check that
 * was skipped for want of a key and a check that ran and found nothing look
 * identical from the outside, and only this page can tell them apart — which is
 * exactly what "the AI review didn't run" turns out to be.
 */
export default function AiMonitoringLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<MonitoringLogRow>(
    client,
    AI_MONITORING_LOGS_TABLE,
    'aiMonitoringLogsTable',
  );
  const [openRow, setOpenRow] = useState<MonitoringLogRow | null>(null);

  const open = useCallback((row: MonitoringLogRow) => setOpenRow(row), []);
  const close = useCallback(() => setOpenRow(null), []);

  return (
    <Box>
      <Stack sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{
          fontWeight: 700
        }}>
          {t('ai.monitoringLogs.title')}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {t('ai.monitoringLogs.subtitle')}
        </Typography>
      </Stack>

      <MonitoringLogsTable fetchRows={fetchRows} refetchRef={refetchRef} onRowClick={open} />
      <MonitoringLogDrawer row={openRow} onClose={close} />
    </Box>
  );
}
