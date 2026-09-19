import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { ProductStatusChip } from '../../components/chips';
import ProductThumb from '../../components/ProductThumb';
import { money } from '../../lib/format';
import { codeLabel, codeOptions, PRODUCT_STATUS_KEYS } from '../../lib/status';
import PackagingCell from './packaging/PackagingCell';
import type { StoreProductRow } from './queries';

const nameOf = (row: StoreProductRow) => row.title || row.product_name;

const renderImage = (row: StoreProductRow) => <ProductThumb src={row.image_url} />;
const renderPackaging = (row: StoreProductRow) => <PackagingCell row={row} />;

const renderName = (row: StoreProductRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2, minWidth: 0 }} data-testid="product-row-name">
    <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 600 }}>
      {nameOf(row)}
    </Typography>
    <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
      {row.sku}
    </Typography>
  </Stack>
);

const renderStatus = (row: StoreProductRow) => <ProductStatusChip status={row.status} />;

/** The products table's columns — sortable and filterable where the server can answer. */
export function useProductColumns(): DuncitColumn<StoreProductRow>[] {
  const { t } = useTranslation();
  return useMemo<DuncitColumn<StoreProductRow>[]>(() => {
    const yesNo = (on: boolean) => (on ? t('shell.common.yes') : t('shell.common.no'));
    const stockOf = (row: StoreProductRow) =>
      row.variant_count > 0
        ? t('ecommPortal.products.stockVariants', { vars: { stock: row.available }, count: row.variant_count })
        : String(row.available);
    return [
      { field: 'image_url', headerName: t('ecommPortal.form.image'), type: 'text', width: 76, sortable: false, filterable: false, cellRenderer: renderImage },
      { field: 'product_name', headerName: t('ecommPortal.common.product'), type: 'text', minWidth: 240, flex: 1, filterable: false, cellRenderer: renderName, valueGetter: nameOf },
      { field: 'sku', headerName: t('ecommPortal.products.sku'), type: 'text', width: 140, hide: true, filterable: false },
      { field: 'brand_name', headerName: t('ecommPortal.products.brand'), type: 'text', width: 150, valueGetter: (row) => row.brand_name || EM_DASH },
      { field: 'price', headerName: t('ecommPortal.products.price'), type: 'number', width: 110, valueGetter: (row) => money(row.price) },
      { field: 'mrp', headerName: t('ecommPortal.products.mrp'), type: 'number', width: 110, hide: true, sortable: false, filterable: false, valueGetter: (row) => money(row.mrp) },
      { field: 'inventory_count', headerName: t('ecommPortal.products.available'), type: 'number', width: 150, filterable: false, valueGetter: stockOf },
      {
        field: 'packaging',
        headerName: t('ecommPortal.products.packaging'),
        type: 'text',
        width: 170,
        sortable: false,
        filterable: false,
        cellRenderer: renderPackaging,
        valueGetter: (row) =>
          row.packaging_missing.length > 0
            ? t('packaging.missing')
            : t('ecommPortal.shipping.kg', { vars: { value: row.chargeable_weight_kg } }),
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        type: 'enum',
        options: codeOptions(PRODUCT_STATUS_KEYS, t),
        width: 130,
        filterable: false,
        cellRenderer: renderStatus,
        valueGetter: (row) => codeLabel(PRODUCT_STATUS_KEYS, row.status, t),
      },
      { field: 'featured', headerName: t('ecommPortal.products.featured'), type: 'boolean', width: 110, hide: true, valueGetter: (row) => yesNo(row.featured) },
      { field: 'sold_count', headerName: t('ecommPortal.products.sold'), type: 'number', width: 90, hide: true, filterable: false },
      { field: 'view_count', headerName: t('ecommPortal.products.views'), type: 'number', width: 90, hide: true, filterable: false },
      { field: 'wishlist_count', headerName: t('ecommPortal.products.wishlists'), type: 'number', width: 110, hide: true, filterable: false },
      dateColumn<StoreProductRow>({ field: 'updated_at', headerName: t('shell.common.updated'), width: 140 }),
    ];
  }, [t]);
}
