import { dateColumn, type DuncitColumn } from '@duncit/table';
import type { ProductEvent } from '../queries';
import { platformLabel, type Translate } from '../labels';
import { PLATFORM_OPTIONS } from '../../entity-analytics/FilterSelects';

/**
 * The Events table. The member and the session are narrowed from the page's
 * own links (`?user=`, `?session=`) rather than typed: both are ids.
 */
export const eventColumns = (t: Translate, formatDateTime: (date: Date) => string): Array<DuncitColumn<ProductEvent>> => [
  dateColumn<ProductEvent>({
    field: 'occurred_at',
    headerName: t('analytics.product.col.time'),
    hide: false,
    width: 180,
    formatDate: formatDateTime,
  }),
  { field: 'event_name', headerName: t('analytics.product.col.event'), type: 'text', width: 170 },
  { field: 'screen_name', headerName: t('analytics.product.col.screen'), type: 'text', flex: 1, minWidth: 170 },
  {
    field: 'element_name',
    headerName: t('analytics.product.col.element'),
    type: 'text',
    flex: 1,
    minWidth: 150,
    sortable: false,
    filterable: false,
  },
  { field: 'element_id', headerName: t('analytics.product.col.elementId'), type: 'text', width: 150, sortable: false, hide: true },
  {
    field: 'platform',
    headerName: t('analytics.product.col.platform'),
    type: 'enum',
    options: PLATFORM_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })),
    width: 120,
    cellRenderer: (row) => platformLabel(row.platform, t),
  },
  { field: 'app_version', headerName: t('analytics.product.col.appVersion'), type: 'text', width: 120, sortable: false },
  {
    field: 'user_id',
    headerName: t('analytics.product.col.person'),
    type: 'text',
    width: 150,
    sortable: false,
    filterable: false,
    cellRenderer: (row) => row.user_id ?? t('analytics.product.visitor'),
  },
  { field: 'session_id', headerName: t('analytics.product.col.session'), type: 'text', width: 150, sortable: false, hide: true },
];
