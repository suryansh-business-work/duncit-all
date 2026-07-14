import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { PORTAL_MODES_TABLE, SET_PORTAL_MODE, type PortalModeRow, type PortalModeState } from './queries';
import PortalModesTable from './PortalModesTable';
import { notify } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { parseApiError } from '../../utils/parseApiError';

const MODE_VERB: Record<PortalModeState, string> = {
  LIVE: 'go live',
  MAINTENANCE: 'enter maintenance mode',
  DEVELOPMENT: 'enter development mode',
};

export default function PortalModesPage() {
  const confirm = useConfirm();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [setModeMut] = useMutation(SET_PORTAL_MODE);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: PORTAL_MODES_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.portalModesTable.rows as PortalModeRow[], total: data.portalModesTable.total as number };
    },
    [client]
  );

  const handleChange = async (row: PortalModeRow, mode: PortalModeState) => {
    if (mode !== 'LIVE') {
      const ok = await confirm({
        title: `${row.name}: ${MODE_VERB[mode]}?`,
        message: `Visitors to ${row.name} will be blocked with a ${
          mode === 'MAINTENANCE' ? 'maintenance' : 'under-development'
        } page until you set it back to Live.`,
        destructive: true,
        confirmLabel: 'Confirm',
      });
      if (!ok) return;
    }
    setBusyKey(row.key);
    try {
      await setModeMut({ variables: { key: row.key, mode } });
      notify(`${row.name} → ${mode.toLowerCase()}`, 'success');
      refetchRef.current?.();
    } catch (err) {
      notify(parseApiError(err), 'error');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ConstructionIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>Maintenance & Development</Typography>
          <Typography variant="body2" color="text.secondary">
            Toggle any portal, website or app into Maintenance or Development. Only one can be on at a time; both block
            the app with a distinct page.
          </Typography>
        </Box>
      </Stack>

      <Alert severity="info">
        Switching a portal off Live blocks live traffic immediately. Apps recover automatically within a minute of
        returning to Live.
      </Alert>

      <PortalModesTable fetchRows={fetchRows} refetchRef={refetchRef} busyKey={busyKey} onChange={handleChange} />
    </Stack>
  );
}
