import { useCallback, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { VENUES_TABLE, type VenueRow } from './queries';
import VenuesTable from './VenuesTable';

/** Admin → Venues: a read-only list of every venue (server-side table). The
 * venue approval/edit workflow stays in the Onboarding portal. */
export default function VenuesPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: VENUES_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.venuesTable.rows as VenueRow[], total: data.venuesTable.total as number };
    },
    [client],
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <StorefrontIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Venues
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Every registered venue. Approvals and edits are managed in the Onboarding portal.
          </Typography>
        </Box>
      </Stack>
      <VenuesTable fetchRows={fetchRows} refetchRef={refetchRef} />
    </Box>
  );
}
