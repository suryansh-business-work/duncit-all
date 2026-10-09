import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Card, CardContent, Stack } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import BrandToolHero from '../BrandToolHero';
import ReturnDetailDrawer from './ReturnDetailDrawer';
import { buildReturnColumns, getReturnRowId } from './returns-columns';
import { POD_SHOP_RETURNS_TABLE, type ReturnRow } from './returns.queries';

/** Returns buyers raised on the partner's brands: decide, follow the pickup, refund once the goods are back. */
export default function ReturnsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<ReturnRow | null>(null);
  const fetchRows = useApolloTableFetch<ReturnRow>(client, POD_SHOP_RETURNS_TABLE, 'podShopReturnsTable');
  const columns = useMemo(() => buildReturnColumns(t), [t]);

  const updated = useCallback((row: ReturnRow) => {
    setSelected(row);
    refetchRef.current?.();
  }, []);

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <BrandToolHero title={t('partners.returns.title')} intro={t('partners.returns.intro')} />
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <DuncitTable<ReturnRow>
            tableId="partners-app-pod-shop-returns"
            ariaLabel={t('partners.returns.title')}
            columns={columns}
            fetchRows={fetchRows}
            getRowId={getReturnRowId}
            onRowClick={setSelected}
            emptyText={t('partners.returns.empty')}
            defaultSort={{ field: 'created_at', dir: 'desc' }}
            searchPlaceholder={t('partners.returns.searchPlaceholder')}
            refetchRef={refetchRef}
          />
        </CardContent>
      </Card>
      <ReturnDetailDrawer row={selected} onClose={() => setSelected(null)} onUpdated={updated} />
    </Stack>
  );
}
