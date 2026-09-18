import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import { FlagChip } from '../../components/chips';
import ProductThumb from '../../components/ProductThumb';
import { money } from '../../lib/format';
import type { StoreListingRow } from './queries';

const renderImage = (row: StoreListingRow) => <ProductThumb src={row.image_url} />;

const renderName = (row: StoreListingRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2, minWidth: 0 }}>
    <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 600 }}>
      {row.title || row.product_name}
    </Typography>
    <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
      {row.sku}
    </Typography>
  </Stack>
);

/** The listings table's columns — sortable and filterable where the server can answer. */
export function useListingColumns(): DuncitColumn<StoreListingRow>[] {
  const { t } = useTranslation();
  return useMemo<DuncitColumn<StoreListingRow>[]>(() => {
    const yesNo = (on: boolean) => (on ? t('shell.common.yes') : t('shell.common.no'));
    const renderListed = (row: StoreListingRow) => (
      <FlagChip on={row.listed} onLabel={t('ecommPortal.products.onStore')} offLabel={t('ecommPortal.products.offStore')} />
    );
    return [
      { field: 'image_url', headerName: t('ecommPortal.form.image'), type: 'text', width: 76, sortable: false, filterable: false, cellRenderer: renderImage },
      { field: 'product_name', headerName: t('ecommPortal.common.product'), type: 'text', minWidth: 240, flex: 1, filterable: false, cellRenderer: renderName, valueGetter: (row) => row.title || row.product_name },
      { field: 'sku', headerName: t('ecommPortal.products.sku'), type: 'text', width: 140, hide: true, filterable: false },
      { field: 'brand_name', headerName: t('ecommPortal.products.brand'), type: 'text', width: 150 },
      { field: 'price', headerName: t('ecommPortal.products.price'), type: 'number', width: 110, valueGetter: (row) => money(row.price) },
      { field: 'mrp', headerName: t('ecommPortal.products.mrp'), type: 'number', width: 110, sortable: false, filterable: false, valueGetter: (row) => money(row.mrp) },
      { field: 'inventory_count', headerName: t('ecommPortal.products.available'), type: 'number', width: 110, filterable: false, valueGetter: (row) => row.available },
      { field: 'listed', headerName: t('ecommPortal.products.listed'), type: 'boolean', width: 130, cellRenderer: renderListed, valueGetter: (row) => yesNo(row.listed) },
      { field: 'featured', headerName: t('ecommPortal.products.featured'), type: 'boolean', width: 110, valueGetter: (row) => yesNo(row.featured) },
      { field: 'sold_count', headerName: t('ecommPortal.products.sold'), type: 'number', width: 90, filterable: false },
      { field: 'view_count', headerName: t('ecommPortal.products.views'), type: 'number', width: 90, filterable: false },
      { field: 'wishlist_count', headerName: t('ecommPortal.products.wishlists'), type: 'number', width: 110, filterable: false },
      dateColumn<StoreListingRow>({ field: 'updated_at', headerName: t('shell.common.updated'), width: 140 }),
    ];
  }, [t]);
}
