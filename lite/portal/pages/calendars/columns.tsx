import type { ReactNode } from 'react';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { SITE_URL } from '../../../shared/env';
import type { usePortalT } from '../../../shared/i18n';
import { ExternalLink } from '../../components/ExternalLink';
import { FlagChip } from '../../components/FlagChip';
import type { LiteAdminCalendarRow } from '../../graphql/calendars';

type Translate = ReturnType<typeof usePortalT>['t'];

export const calendarRowId = (row: LiteAdminCalendarRow): string => row.id;

export function buildCalendarColumns(t: Translate, renderActions: (row: LiteAdminCalendarRow) => ReactNode): DuncitColumn<LiteAdminCalendarRow>[] {
  const featured = t('litePortal.common.featured');
  const notFeatured = t('litePortal.common.notFeatured');
  return [
    {
      field: 'name',
      headerName: t('litePortal.calendars.colName'),
      type: 'text',
      flex: 1,
      minWidth: 220,
      cellRenderer: (row) => (
        <ExternalLink href={`${SITE_URL}/cal/${row.slug}`} label={row.name} ariaLabel={t('litePortal.common.viewOnSite', { vars: { name: row.name } })} testId={`calendar-link-${row.id}`} />
      ),
      valueGetter: (row) => row.name,
    },
    { field: 'owner.name', headerName: t('litePortal.calendars.colOwner'), type: 'text', flex: 1, minWidth: 180, sortable: false, filterable: false, valueGetter: (row) => `${row.owner.name} (@${row.owner.handle})` },
    { field: 'city_slug', headerName: t('litePortal.calendars.colCity'), type: 'text', width: 140, valueGetter: (row) => row.city_name ?? EM_DASH },
    { field: 'subscriber_count', headerName: t('litePortal.calendars.colSubscribers'), type: 'number', width: 130, filterable: false },
    {
      field: 'featured',
      headerName: t('litePortal.calendars.colFeatured'),
      type: 'boolean',
      width: 140,
      cellRenderer: (row) => <FlagChip on={row.featured} onLabel={featured} offLabel={notFeatured} />,
      valueGetter: (row) => (row.featured ? featured : notFeatured),
    },
    dateColumn({ headerName: t('litePortal.common.created'), hide: false }),
    { field: 'actions', headerName: t('litePortal.common.actions'), type: 'actions', width: 90, cellRenderer: renderActions },
  ];
}
