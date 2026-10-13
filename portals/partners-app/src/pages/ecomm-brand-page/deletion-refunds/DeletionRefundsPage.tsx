import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Card, CardContent, Stack } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import BrandPicker, { ALL_BRANDS } from '../BrandPicker';
import BrandToolHero from '../BrandToolHero';
import { MY_BRAND_OPTIONS, type BrandOption } from '../queries';
import { getOrderRowId } from '../orders/orders-columns';
import { MY_DELETION_REFUNDS_TABLE, type OrderRow } from '../orders/orders.queries';
import { buildRefundColumns } from './refund-columns';

/**
 * `/ecomm-brand/deletion-refunds` — the buyers refunded because a brand or a
 * product was deleted with "cancel all running orders now and refund buyers in
 * full": one row per cancelled order, with the amount going back and the state
 * of the refund. The table's Download menu exports it as CSV.
 */
export default function DeletionRefundsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const navigate = useNavigate();
  const [brandId, setBrandId] = useState(ALL_BRANDS);
  const { data: brandsData } = useQuery<{ myEcommBrands: BrandOption[] }>(MY_BRAND_OPTIONS, { fetchPolicy: 'cache-and-network' });
  const fetchRows = useApolloTableFetch<OrderRow>(
    client,
    MY_DELETION_REFUNDS_TABLE,
    'myDeletionRefundsTable',
    { extraVariables: { brand_id: brandId || null } },
    [brandId],
  );
  // The table reads fetchRows through a ref and only reloads on a query change, so a new brand needs an explicit reload.
  const pickBrand = (id: string) => {
    setBrandId(id);
    refetchRef.current?.();
  };
  const columns = useMemo(() => buildRefundColumns(t), [t]);
  const openOrder = useCallback((row: OrderRow) => navigate(`/ecomm-brand/orders/${row.id}`), [navigate]);

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <BrandToolHero title={t('partners.deletionRefunds.title')} intro={t('partners.deletionRefunds.intro')} />
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <DuncitTable<OrderRow>
            tableId="partners-app-deletion-refunds"
            ariaLabel={t('partners.deletionRefunds.title')}
            columns={columns}
            fetchRows={fetchRows}
            getRowId={getOrderRowId}
            onRowClick={openOrder}
            emptyText={t('partners.deletionRefunds.empty')}
            defaultSort={{ field: 'cancelled_at', dir: 'desc' }}
            searchPlaceholder={t('partners.deletionRefunds.searchPlaceholder')}
            refetchRef={refetchRef}
            toolbarActions={<BrandPicker brands={brandsData?.myEcommBrands ?? []} value={brandId} onChange={pickBrand} allowAll />}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
