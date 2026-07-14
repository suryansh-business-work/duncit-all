import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useCallback, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import EcommBrandsTable from './EcommBrandsTable';
import { MARKETPLACE_BRANDS_TABLE, type EcommBrandRow } from './queries';

export default function EcommMarketplacePage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  // The server defaults to APPROVED brands when no status filter is set —
  // same default view the old status select opened with.
  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: MARKETPLACE_BRANDS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.marketplaceBrandsTable.rows as EcommBrandRow[],
        total: data.marketplaceBrandsTable.total as number,
      };
    },
    [client],
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          E-commerce brands
        </Typography>
        <Typography variant="body2" color="text.secondary">
          External seller brands, their approved catalogue size and pickup readiness.
        </Typography>
      </Box>

      <EcommBrandsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onView={(b) => navigate(`/ecomm/brands/${b.id}`)}
      />
    </Stack>
  );
}
