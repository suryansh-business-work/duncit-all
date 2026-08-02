import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { TableQueryState } from '@duncit/table';
import CancellationsTable from './CancellationsTable';
import CancellationDetailDialog from './CancellationDetailDialog';
import {
  applyCancellationQuery,
  POD_CANCELLATIONS,
  type PodCancellationRow,
} from './queries';

/** Pods cancelled from the venue's side (booking request declined). */
export default function VenueCancelPage() {
  const client = useApolloClient();
  const [selected, setSelected] = useState<PodCancellationRow | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const result = await client.query<{ podCancellations: PodCancellationRow[] }>({
        query: POD_CANCELLATIONS,
        variables: { kind: 'VENUE' },
        fetchPolicy: 'network-only',
      });
      return applyCancellationQuery(result.data?.podCancellations ?? [], q);
    },
    [client],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <StorefrontIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Venue Cancel
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pods that ended because the venue declined the booking.
          </Typography>
        </Box>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        A venue can only decline a pod before it goes live, so nobody has paid yet — attendee
        refunds here should always be zero. Open a row to see the decline reason and what the
        booking was worth.
      </Alert>

      <CancellationsTable
        tableId="finance-cancellations-venue"
        fetchRows={fetchRows}
        onRowClick={setSelected}
        emptyText="No venue-declined pods yet."
      />
      <CancellationDetailDialog row={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
