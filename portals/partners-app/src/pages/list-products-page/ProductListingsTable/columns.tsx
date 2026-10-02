import type { DuncitColumn } from '@duncit/table';
import type { ReactNode } from 'react';
import type { useTranslation } from '@duncit/shell';
import { formatDate } from '@duncit/app-settings';
import { renderListingStatus, renderProduct } from '../ProductListingCells';
import type { ProductListingRow } from '../queries';

/** Available stock at/below the product's low-stock threshold (opt-in per product). */
export const isLowStock = (product: ProductListingRow) =>
  Boolean(product.notify_low_stock) &&
  Number(product.available_count ?? product.inventory_count ?? 0) <= Number(product.low_stock_alert ?? 0);

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'DENIED'].map((value) => ({ value, label: value }));
export type Translate = ReturnType<typeof useTranslation>['t'];

const deliveryOptions = (t: Translate) =>[
  { value: 'HOST', label: t('partners.common.host') },
  { value: 'VENUE', label: t('partners.common.venue') },
];

export const getProductRowId = (product: ProductListingRow) => product.id;

type RowRenderer = (product: ProductListingRow) => ReactNode;

/** The listing columns; the two stateful renderers come from the table. */
export const buildListingColumns = (
  t: Translate,
  renderQuantity: RowRenderer,
  renderActions: RowRenderer,
): DuncitColumn<ProductListingRow>[] => [
  {
    field: 'product_name',
    headerName: t('partners.listProductsPage.product'),
    flex: 1,
    minWidth: 240,
    type: 'text',
    cellRenderer: renderProduct,
    valueGetter: (product) => product.product_name,
  },
  {
    field: 'unit_cost',
    headerName: t('partners.common.price'),
    width: 110,
    type: 'number',
    valueGetter: (product) => `₹${Number(product.unit_cost ?? 0).toFixed(2)}`,
  },
  {
    field: 'inventory_count',
    headerName: t('partners.listProductsPage.quantity'),
    width: 190,
    type: 'number',
    cellRenderer: renderQuantity,
    valueGetter: (product) => product.inventory_count ?? 0,
  },
  {
    field: 'listing_review_status',
    headerName: t('shell.common.status'),
    width: 130,
    type: 'enum',
    options: STATUS_OPTIONS,
    cellRenderer: renderListingStatus,
    valueGetter: (product) => product.listing_review_status,
  },
  {
    field: 'delivery_target',
    headerName: t('partners.listProductsPage.delivery'),
    hide: true,
    width: 120,
    type: 'enum',
    options: deliveryOptions(t),
  },
  {
    field: 'updated_at',
    headerName: t('shell.common.updated'),
    hide: true,
    width: 140,
    type: 'date',
    valueGetter: (product) =>
      formatDate(product.updated_at) || '—',
  },
  { field: 'actions', headerName: '', type: 'actions', width: 72, cellRenderer: renderActions },
];
