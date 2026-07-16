import { useApolloClient } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import PodsTable from '../../components/pods-table/PodsTable';
import { PODS_TABLE, type PodRow } from '../../components/pods-table/queries';
import { useDateFormat } from '@duncit/app-settings';

export default function VenuePodsTab({ venueId }: Readonly<{ venueId: string }>) {
  const { formatDateTime } = useDateFormat();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<PodRow>(
    client,
    PODS_TABLE,
    'podsTable',
    { extraFilters: [{ field: 'venue_id', op: 'eq', value: venueId }] },
    [venueId],
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
