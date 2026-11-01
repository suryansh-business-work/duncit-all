import type { DuncitColumn } from '@duncit/table';
import type { ProductScreenRow } from '../queries';
import { asDuration, asPercent, type Translate } from '../labels';

/** The Screens table. Sortable on every column; filterable where the server can filter. */
export const screenColumns = (t: Translate): Array<DuncitColumn<ProductScreenRow>> => [
  { field: 'screen_name', headerName: t('analytics.product.col.screen'), type: 'text', flex: 2, minWidth: 220 },
  { field: 'views', headerName: t('analytics.product.col.views'), type: 'number', width: 120 },
  { field: 'unique_users', headerName: t('analytics.product.col.uniqueUsers'), type: 'number', width: 140 },
  {
    field: 'avg_time_ms',
    headerName: t('analytics.product.col.avgTime'),
    type: 'number',
    width: 130,
    filterable: false,
    cellRenderer: (row) => asDuration(row.avg_time_ms),
  },
  {
    field: 'total_time_ms',
    headerName: t('analytics.product.col.totalTime'),
    type: 'number',
    width: 130,
    filterable: false,
    hide: true,
    cellRenderer: (row) => asDuration(row.total_time_ms),
  },
  { field: 'entries', headerName: t('analytics.product.col.entries'), type: 'number', width: 110, filterable: false },
  { field: 'exits', headerName: t('analytics.product.col.exits'), type: 'number', width: 110, filterable: false },
  {
    field: 'exit_rate',
    headerName: t('analytics.product.col.exitRate'),
    type: 'number',
    width: 120,
    cellRenderer: (row) => asPercent(row.exit_rate),
  },
  {
    field: 'bounce_rate',
    headerName: t('analytics.product.col.bounceRate'),
    type: 'number',
    width: 130,
    filterable: false,
    cellRenderer: (row) => asPercent(row.bounce_rate),
  },
];
