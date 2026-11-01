import type { DuncitColumn } from '@duncit/table';
import type { ProductElementRow } from '../queries';
import { asPercent, type Translate } from '../labels';

/** The Clickstream table: one row per element per screen. CTR = clicks ÷ views of that screen. */
export const elementColumns = (t: Translate): Array<DuncitColumn<ProductElementRow>> => [
  {
    field: 'element_name',
    headerName: t('analytics.product.col.element'),
    type: 'text',
    flex: 2,
    minWidth: 200,
    filterable: false,
  },
  { field: 'element_id', headerName: t('analytics.product.col.elementId'), type: 'text', width: 180, filterable: false, sortable: false, hide: true },
  { field: 'screen_name', headerName: t('analytics.product.col.screen'), type: 'text', flex: 1, minWidth: 180 },
  { field: 'element_type', headerName: t('analytics.product.col.elementType'), type: 'text', width: 120 },
  { field: 'clicks', headerName: t('analytics.product.col.clicks'), type: 'number', width: 110 },
  { field: 'unique_users', headerName: t('analytics.product.col.uniqueUsers'), type: 'number', width: 140 },
  { field: 'repeat_clicks', headerName: t('analytics.product.col.repeatClicks'), type: 'number', width: 140, filterable: false },
  { field: 'screen_views', headerName: t('analytics.product.col.screenViews'), type: 'number', width: 130, filterable: false },
  {
    field: 'ctr',
    headerName: t('analytics.product.col.ctr'),
    type: 'number',
    width: 110,
    cellRenderer: (row) => asPercent(row.ctr),
  },
];
