import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { useApolloTableFetch } from '@duncit/table';
import PodAuditDetailDialog from './PodAuditDetailDialog';
import PodMonitoringTable from './PodMonitoringTable';
import { POD_AUDIT_LOGS_TABLE, type PodAuditLog } from './queries';

/** Admin > Pods > Pod Monitoring (AI) — the AI-monitored audit trail of every
 * pod edit, status change and critical action across all surfaces. */
export default function PodMonitoringPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<PodAuditLog | null>(null);

  const fetchRows = useApolloTableFetch<PodAuditLog>(
    client,
    POD_AUDIT_LOGS_TABLE,
    'podAuditLogsTable',
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <MonitorHeartIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>Pod Monitoring (AI)</Typography>
          <Typography variant="body2" color="text.secondary">
            Every pod edit, status change and critical action — risk-scored by AI for auditability.
          </Typography>
        </Box>
      </Stack>

      <PodMonitoringTable fetchRows={fetchRows} refetchRef={refetchRef} onRowClick={setSelected} />
      <PodAuditDetailDialog log={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
