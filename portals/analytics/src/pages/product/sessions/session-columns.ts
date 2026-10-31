import { dateColumn, type DuncitColumn } from '@duncit/table';
import type { ProductSession } from '../queries';
import { asDuration, platformLabel, type Translate } from '../labels';
import { PLATFORM_OPTIONS } from '../../entity-analytics/FilterSelects';

/** The Sessions table. A visitor who never signed in is named as one. */
export const sessionColumns = (t: Translate, formatDateTime: (date: Date) => string): Array<DuncitColumn<ProductSession>> => [
  dateColumn<ProductSession>({
    field: 'started_at',
    headerName: t('analytics.product.col.started'),
    hide: false,
    width: 180,
    formatDate: formatDateTime,
  }),
  {
    field: 'user_name',
    headerName: t('analytics.product.col.person'),
    type: 'text',
    flex: 1,
    minWidth: 170,
    sortable: false,
    filterable: false,
    cellRenderer: (row) => row.user_name || t('analytics.product.visitor'),
  },
  {
    field: 'platform',
    headerName: t('analytics.product.col.platform'),
    type: 'enum',
    options: PLATFORM_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })),
    width: 120,
    cellRenderer: (row) => platformLabel(row.platform, t),
  },
  { field: 'app_version', headerName: t('analytics.product.col.appVersion'), type: 'text', width: 120 },
  {
    field: 'duration_ms',
    headerName: t('analytics.product.col.duration'),
    type: 'number',
    width: 120,
    cellRenderer: (row) => asDuration(row.duration_ms),
  },
  { field: 'screen_views', headerName: t('analytics.product.col.screens'), type: 'number', width: 110 },
  { field: 'events', headerName: t('analytics.product.col.events'), type: 'number', width: 100, filterable: false },
  { field: 'entry_screen', headerName: t('analytics.product.col.entryScreen'), type: 'text', flex: 1, minWidth: 160, sortable: false },
  { field: 'exit_screen', headerName: t('analytics.product.col.exitScreen'), type: 'text', flex: 1, minWidth: 160, sortable: false },
];
