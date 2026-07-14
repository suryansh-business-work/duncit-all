import { useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import PodsTable from '../../components/pods-table/PodsTable';
import { PODS_TABLE, type PodRow } from '../../components/pods-table/queries';
import { useDateFormat } from '../../utils/dateFormat';

export default function VenuePodsTab({ venueId }: Readonly<{ venueId: string }>) {
  const { formatDateTime } = useDateFormat();
  const client = useApolloClient();

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const filters = [...q.filters, { field: 'venue_id', op: 'eq' as const, value: venueId }];
      const { data } = await client.query({
        query: PODS_TABLE,
        variables: tableQueryToGql({ ...q, filters }),
        fetchPolicy: 'network-only',
      });
      return { rows: data.podsTable.rows as PodRow[], total: data.podsTable.total as number };
    },
    [client, venueId],
  );

  if (!venueId) return null;

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.25}>
        <Typography variant="h6" fontWeight={900}>
          Pods at this venue
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Every pod hosted here — live and upcoming. Deactivating or deleting the venue is blocked while pods are attached.
        </Typography>
      </Stack>

      <PodsTable
        tableId="onboarding-venue-pods"
        fetchRows={fetchRows}
        formatDateTime={formatDateTime}
        showHosts
        showApproval
      />
    </Stack>
  );
}
