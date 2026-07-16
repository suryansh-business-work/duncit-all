import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import ProductOrdersTable from './ProductOrdersTable';
import { PRODUCT_ORDERS_TABLE, type ProductOrderRow } from './queries';

export default function ProductOrdersPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useApolloTableFetch<ProductOrderRow>(client, PRODUCT_ORDERS_TABLE, 'productOrdersTable');

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
