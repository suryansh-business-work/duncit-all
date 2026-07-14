import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useCallback, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import ProductOrdersTable from './ProductOrdersTable';
import { PRODUCT_ORDERS_TABLE, type ProductOrderRow } from './queries';

export default function ProductOrdersPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: PRODUCT_ORDERS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.productOrdersTable.rows as ProductOrderRow[],
        total: data.productOrdersTable.total as number,
      };
    },
    [client],
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Product orders
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Every product order placed inside a pod — fulfilment ops for shipping and pickup.
        </Typography>
      </Box>

      <ProductOrdersTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onView={(o) => navigate(`/orders/${o.id}`)}
      />
    </Stack>
  );
}
