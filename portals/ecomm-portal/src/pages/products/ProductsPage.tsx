import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Paper, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CategoryIcon from '@mui/icons-material/Category';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import StoreTable from '../../components/StoreTable';
import { useTableRefresh } from '../../components/useTableActions';
import BulkFileForm, { type BulkFileValues } from './bulk-file';
import { BULK_FILE, SET_LISTED, STORE_LISTINGS_TABLE, type StoreListingRow } from './queries';
import { useListingColumns } from './useListingColumns';

/**
 * Every approved catalogue product and how it reads on the store. Tick rows to
 * put them on or take them off the shelf, or file them in bulk; open one to
 * edit its listing.
 */
export default function ProductsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const columns = useListingColumns();
  const { refetchRef, run } = useTableRefresh();
  const clearRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<StoreListingRow[]>([]);
  const [filing, setFiling] = useState(false);
  const [setListed, listedState] = useMutation(SET_LISTED);
  const [bulkFile, fileState] = useMutation(BULK_FILE);
  const ids = selected.map((row) => row.id);

  const changeListed = async (listed: boolean) => {
    let changed = 0;
    const done = await run(async () => {
      const result = await setListed({ variables: { product_ids: ids, listed } });
      changed = result.data?.storeSetListed ?? 0;
    }, () => t('ecommPortal.products.listedChanged', { vars: { changed, total: ids.length } }));
    if (done) clearRef.current?.();
  };

  const file = async (values: BulkFileValues) => {
    let changed = 0;
    const done = await run(async () => {
      const result = await bulkFile({ variables: { product_ids: ids, ...values } });
      changed = result.data?.storeBulkFile ?? 0;
    }, () => t('ecommPortal.products.filed', { count: changed }));
    if (!done) return;
    setFiling(false);
    clearRef.current?.();
  };

  const busy = listedState.loading || fileState.loading;
  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.products')} subtitle={t('ecommPortal.products.subtitle')} />
      {ids.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.5 }} role="region" aria-label={t('ecommPortal.products.bulkActions')}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" role="status" sx={{ fontWeight: 700, mr: 1 }}>
              {t('ecommPortal.products.selected', { count: ids.length })}
            </Typography>
            <DuncitButton size="small" variant="contained" startIcon={<StorefrontIcon />} disabled={busy} onClick={() => changeListed(true)}>
              {t('ecommPortal.products.listOnStore')}
            </DuncitButton>
            <DuncitButton size="small" variant="outlined" startIcon={<VisibilityOffIcon />} disabled={busy} onClick={() => changeListed(false)}>
              {t('ecommPortal.products.takeOff')}
            </DuncitButton>
            <DuncitButton size="small" variant="outlined" startIcon={<CategoryIcon />} disabled={busy} onClick={() => setFiling(true)}>
              {t('ecommPortal.products.fileUnder')}
            </DuncitButton>
          </Stack>
        </Paper>
      )}
      <StoreTable<StoreListingRow>
        tableId="ecomm-listings"
        query={STORE_LISTINGS_TABLE}
        resultKey="storeListingsTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.products')}
        emptyText={t('ecommPortal.products.empty')}
        searchPlaceholder={t('ecommPortal.products.search')}
        refetchRef={refetchRef}
        selection={{ onChange: setSelected, clearRef }}
        onRowClick={(row) => navigate(`/products/${row.id}`)}
      />
      {filing && <BulkFileForm count={ids.length} busy={fileState.loading} onClose={() => setFiling(false)} onSubmit={file} />}
    </Stack>
  );
}
