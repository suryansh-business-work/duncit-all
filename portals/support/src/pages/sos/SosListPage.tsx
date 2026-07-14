import { useCallback, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import type { TableQueryState } from '@duncit/table';
import { BOUNCER_SOS_ALERTS, type SosAlertPage } from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';
import { supportListVars } from '../../lib/supportTable';
import SosTable from './SosTable';

export default function SosListPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<{ bouncerSosAlerts: SosAlertPage }>({
        query: BOUNCER_SOS_ALERTS,
        variables: supportListVars(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.bouncerSosAlerts.items, total: data.bouncerSosAlerts.total };
    },
    [client]
  );

  useSupportSocket({
    onSos: () => refetchRef.current?.(),
    onSosUpdate: () => refetchRef.current?.(),
  });

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          SOS Alerts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live safety alerts raised by users. Open one to acknowledge or resolve it.
        </Typography>
      </Box>
      <SosTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onRowClick={(a) => navigate(`/sos/${a.id}`)}
      />
    </Stack>
  );
}
