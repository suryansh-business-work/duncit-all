import { useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import ReturnDetailDialog from './ReturnDetailDialog';
import { returnColumns } from './returnColumns';
import { POD_SHOP_RETURNS_TABLE, type PodShopReturnRow } from './queries';

const getRowId = (row: PodShopReturnRow) => row.id;

/** Products › Fulfilment › Product Returns: every pod-shop return, any brand, with the next step on each. */
export default function ReturnsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();
  const refetchRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<PodShopReturnRow | null>(null);
  const fetchRows = useApolloTableFetch<PodShopReturnRow>(client, POD_SHOP_RETURNS_TABLE, 'podShopReturnsTable');
  const columns = useMemo(() => returnColumns(t, formatDateTime), [t, formatDateTime]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
          {t('products.returns.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('products.returns.description')}
        </Typography>
      </Box>
      <DuncitTable<PodShopReturnRow>
        ariaLabel={t('products.returns.title')}
        tableId="products-returns"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={setSelected}
        emptyText={t('products.returns.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('products.returns.search')}
        refetchRef={refetchRef}
      />
      <ReturnDetailDialog row={selected} onClose={() => setSelected(null)} onChanged={() => refetchRef.current?.()} />
    </Stack>
  );
}
