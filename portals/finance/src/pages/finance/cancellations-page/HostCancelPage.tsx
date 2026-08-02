import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import type { TableQueryState } from '@duncit/table';
import CancellationsTable from './CancellationsTable';
import CancellationDetailDialog from './CancellationDetailDialog';
import {
  applyCancellationQuery,
  POD_CANCELLATIONS,
  type PodCancellationRow,
} from './queries';

/** Pods the host cancelled — reason, attendee refund status and the venue's
 * lost booking money, per pod. */
export default function HostCancelPage() {
  const client = useApolloClient();
  const [selected, setSelected] = useState<PodCancellationRow | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const result = await client.query<{ podCancellations: PodCancellationRow[] }>({
        query: POD_CANCELLATIONS,
        variables: { kind: 'HOST' },
        fetchPolicy: 'network-only',
      });
      return applyCancellationQuery(result.data?.podCancellations ?? [], q);
    },
    [client],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <PersonOffIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Host Cancel
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pods cancelled by their host — every successful payment is refunded at cancel time.
          </Typography>
        </Box>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Open a row for the host's reason, each pod's refund status to attendees, and the venue's
        booked amount the cancellation cost.
      </Alert>

      <CancellationsTable
        tableId="finance-cancellations-host"
        fetchRows={fetchRows}
        onRowClick={setSelected}
        emptyText="No host-cancelled pods yet."
      />
      <CancellationDetailDialog row={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
