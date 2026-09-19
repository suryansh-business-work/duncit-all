import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { TableFilterValue } from '@duncit/table';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import StoreTable from '../../components/StoreTable';
import { useTableRefresh } from '../../components/useTableActions';
import { PRODUCT_STATUS_KEYS, type ProductStatus } from '../../lib/status';
import BulkFileForm, { type BulkFileValues } from './bulk-file';
import BulkPackagingForm from './packaging/bulk-packaging';
import PackagingTools from './packaging/PackagingTools';
import { BULK_SET_PACKAGING, type PackagingInput } from './packaging/packaging-queries';
import ProductBulkBar from './ProductBulkBar';
import { BULK_FILE, SET_PRODUCT_STATUS, STORE_PRODUCTS_TABLE, type StoreProductRow } from './queries';
import { useProductColumns } from './useProductColumns';

type StatusView = 'all' | ProductStatus;

const VIEWS: readonly StatusView[] = ['all', 'DRAFT', 'PUBLISHED', 'ARCHIVED'];

/** What a bulk status change announces, per the status it moved the products to. */
const CHANGED_KEYS: Record<ProductStatus, string> = {
  DRAFT: 'ecommPortal.products.movedToDraft',
  PUBLISHED: 'ecommPortal.products.published',
  ARCHIVED: 'ecommPortal.products.archived',
};

const NO_FILTERS: TableFilterValue[] = [];

/**
 * The store's own products — created and edited here, nowhere else. Tick rows
 * to publish, draft, archive or file them together; open one to edit it.
 */
export default function ProductsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const columns = useProductColumns();
  const { refetchRef, run } = useTableRefresh();
  const clearRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<StoreProductRow[]>([]);
  const [filing, setFiling] = useState(false);
  const [packaging, setPackaging] = useState(false);
  const [bulkPackaging, packagingState] = useMutation(BULK_SET_PACKAGING);
  const [setStatus, statusState] = useMutation(SET_PRODUCT_STATUS);
  const [bulkFile, fileState] = useMutation(BULK_FILE);
  const ids = selected.map((row) => row.id);

  const views = useMemo<DuncitTabItem<StatusView>[]>(
    () =>
      VIEWS.map((value) => ({
        value,
        label: value === 'all' ? t('ecommPortal.products.allStatuses') : t(PRODUCT_STATUS_KEYS[value]),
      })),
    [t],
  );
  const tabs = useTabParam<StatusView>({ items: views, fallback: 'all' });
  const filters = useMemo<TableFilterValue[]>(
    () => (tabs.value === 'all' ? NO_FILTERS : [{ field: 'status', op: 'eq', value: tabs.value }]),
    [tabs.value],
  );

  const changeStatus = async (status: ProductStatus) => {
    let changed = 0;
    const done = await run(async () => {
      const result = await setStatus({ variables: { ids, status } });
      changed = result.data?.storeSetProductStatus ?? 0;
    }, () => t(CHANGED_KEYS[status], { vars: { changed, total: ids.length } }));
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

  const setPackagingOn = async (input: PackagingInput) => {
    let changed = 0;
    const done = await run(async () => {
      const result = await bulkPackaging({ variables: { product_ids: ids, input } });
      changed = result.data?.storeBulkSetPackaging ?? 0;
    }, () => t('ecommPortal.products.packagingSet', { count: changed }));
    if (done) clearRef.current?.();
    return done;
  };

  const addButton = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <PackagingTools onImported={() => refetchRef.current?.()} />
      <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/products/new')} data-testid="products-add">
        {t('ecommPortal.products.add')}
      </DuncitButton>
    </Stack>
  );

  return (
    <Stack spacing={3} data-testid="products-page">
      <PageHeader title={t('ecommPortal.nav.products')} subtitle={t('ecommPortal.products.subtitle')} actions={addButton} />
      <DuncitTabs {...tabs} aria-label={t('ecommPortal.products.statusFilter')} data-testid="products-status-tabs" />
      {ids.length > 0 && (
        <ProductBulkBar
          count={ids.length}
          busy={statusState.loading || fileState.loading || packagingState.loading}
          onStatus={changeStatus}
          onFile={() => setFiling(true)}
          onPackaging={() => setPackaging(true)}
        />
      )}
      <StoreTable<StoreProductRow>
        tableId="ecomm-products"
        query={STORE_PRODUCTS_TABLE}
        resultKey="storeAdminProductsTable"
        columns={columns}
        externalFilters={filters}
        ariaLabel={t('ecommPortal.nav.products')}
        emptyText={t('ecommPortal.products.empty')}
        searchPlaceholder={t('ecommPortal.products.search')}
        refetchRef={refetchRef}
        selection={{ onChange: setSelected, clearRef }}
        onRowClick={(row) => navigate(`/products/${row.id}`)}
      />
      {filing && <BulkFileForm count={ids.length} busy={fileState.loading} onClose={() => setFiling(false)} onSubmit={file} />}
      {packaging && (
        <BulkPackagingForm count={ids.length} busy={packagingState.loading} onClose={() => setPackaging(false)} onSubmit={setPackagingOn} />
      )}
    </Stack>
  );
}
