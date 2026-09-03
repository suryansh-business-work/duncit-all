import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { useApolloTableFetch } from '@duncit/table';
import type { PodAuditLog } from '@duncit/utils';
import ClubAdminPodMonitoringTable from './ClubAdminPodMonitoringTable';
import PodAuditDetailDialog from './PodAuditDetailDialog';
import { CLUB_ADMIN_POD_AUDIT_LOGS_TABLE } from './queries';
import { useTranslation } from '@duncit/shell';

/** Club Admin > Pod Monitoring (AI) — the AI-monitored audit trail of every
 * pod edit, status change and critical action across the caller's clubs. */
export default function ClubAdminPodMonitoringPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<PodAuditLog | null>(null);

  const fetchRows = useApolloTableFetch<PodAuditLog>(
    client,
    CLUB_ADMIN_POD_AUDIT_LOGS_TABLE,
    'clubAdminPodAuditLogsTable',
  );

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 3
        }}>
        <MonitorHeartIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>{t('clubAdmin.monitoring.title')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('clubAdmin.monitoring.subtitle')}
          </Typography>
        </Box>
      </Stack>

      <ClubAdminPodMonitoringTable fetchRows={fetchRows} refetchRef={refetchRef} onRowClick={setSelected} />
      <PodAuditDetailDialog log={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
