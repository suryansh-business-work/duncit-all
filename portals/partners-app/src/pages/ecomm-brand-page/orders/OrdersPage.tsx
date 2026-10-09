import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Card, CardContent, Stack } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import BrandPicker, { ALL_BRANDS } from '../BrandPicker';
import BrandToolHero from '../BrandToolHero';
import { MY_BRAND_OPTIONS, type BrandOption } from '../queries';
import { buildOrderColumns, getOrderRowId } from './orders-columns';
import { BRAND_ORDERS_TABLE, type OrderRow } from './orders.queries';

/** Pod Shop orders on the partner's brands: book the shipment, fix the ship-to, print the papers, follow the courier. */
export default function OrdersPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const navigate = useNavigate();
  const [brandId, setBrandId] = useState(ALL_BRANDS);
  const { data: brandsData } = useQuery<{ myEcommBrands: BrandOption[] }>(MY_BRAND_OPTIONS, { fetchPolicy: 'cache-and-network' });
  const fetchRows = useApolloTableFetch<OrderRow>(
    client,
    BRAND_ORDERS_TABLE,
    'brandProductOrdersTable',
    { extraVariables: { brand_id: brandId || null } },
    [brandId],
  );
  const columns = useMemo(() => buildOrderColumns(t), [t]);

  const openOrder = useCallback((row: OrderRow) => navigate(`/ecomm-brand/orders/${row.id}`), [navigate]);

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <BrandToolHero title={t('partners.orders.title')} intro={t('partners.orders.intro')} />
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <DuncitTable<OrderRow>
            tableId="partners-app-brand-orders"
            ariaLabel={t('partners.orders.title')}
            columns={columns}
            fetchRows={fetchRows}
            getRowId={getOrderRowId}
            onRowClick={openOrder}
            emptyText={t('partners.orders.empty')}
            defaultSort={{ field: 'created_at', dir: 'desc' }}
            searchPlaceholder={t('partners.orders.searchPlaceholder')}
            refetchRef={refetchRef}
            toolbarActions={<BrandPicker brands={brandsData?.myEcommBrands ?? []} value={brandId} onChange={setBrandId} allowAll />}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
