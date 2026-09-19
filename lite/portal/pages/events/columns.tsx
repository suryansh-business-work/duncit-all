import type { ReactNode } from 'react';
import { formatDateTime } from '@duncit/app-settings';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { SITE_URL } from '../../../shared/env';
import type { usePortalT } from '../../../shared/i18n';
import { EnumChip } from '../../components/EnumChip';
import { ExternalLink } from '../../components/ExternalLink';
import { FlagChip } from '../../components/FlagChip';
import { enumLabel, enumOptions, EVENT_STATUS_COLORS, EVENT_STATUS_KEYS, VISIBILITY_COLORS, VISIBILITY_KEYS } from '../../components/enum-labels';
import type { LiteAdminEventRow } from '../../graphql/events';

type Translate = ReturnType<typeof usePortalT>['t'];

export const eventRowId = (row: LiteAdminEventRow): string => row.id;

/** Every field is one the server sorts and filters on; `going_count` is sort-only. */
export function buildEventColumns(t: Translate, renderActions: (row: LiteAdminEventRow) => ReactNode): DuncitColumn<LiteAdminEventRow>[] {
  const yes = t('lite.common.yes');
  const no = t('lite.common.no');
  const yesNo = (on: boolean) => (on ? yes : no);
  return [
    {
      field: 'title',
      headerName: t('litePortal.events.colTitle'),
      type: 'text',
      flex: 1,
      minWidth: 220,
      cellRenderer: (row) => (
        <ExternalLink href={`${SITE_URL}/e/${row.slug}`} label={row.title} ariaLabel={t('litePortal.common.viewOnSite', { vars: { name: row.title } })} testId={`event-link-${row.id}`} />
      ),
      valueGetter: (row) => row.title,
    },
    dateColumn({ field: 'start_at', headerName: t('litePortal.events.colStart'), hide: false, width: 180, formatDate: formatDateTime }),
    {
      field: 'status',
      headerName: t('litePortal.events.colStatus'),
      type: 'enum',
      options: enumOptions(EVENT_STATUS_KEYS, t),
      width: 130,
      cellRenderer: (row) => <EnumChip value={row.status} keys={EVENT_STATUS_KEYS} colors={EVENT_STATUS_COLORS} />,
      valueGetter: (row) => enumLabel(EVENT_STATUS_KEYS, row.status, t),
    },
    {
      field: 'visibility',
      headerName: t('litePortal.events.colVisibility'),
      type: 'enum',
      options: enumOptions(VISIBILITY_KEYS, t),
      width: 130,
      cellRenderer: (row) => <EnumChip value={row.visibility} keys={VISIBILITY_KEYS} colors={VISIBILITY_COLORS} />,
      valueGetter: (row) => enumLabel(VISIBILITY_KEYS, row.visibility, t),
    },
    { field: 'city_slug', headerName: t('litePortal.events.colCity'), type: 'text', width: 140, valueGetter: (row) => row.city_name ?? EM_DASH },
    { field: 'going_count', headerName: t('litePortal.events.colGoing'), type: 'number', width: 100, filterable: false, valueGetter: (row) => row.stats.going },
    {
      field: 'featured',
      headerName: t('litePortal.events.colFeatured'),
      type: 'boolean',
      width: 120,
      cellRenderer: (row) => <FlagChip on={row.featured} onLabel={yes} offLabel={no} />,
      valueGetter: (row) => yesNo(row.featured),
    },
    {
      field: 'hidden',
      headerName: t('litePortal.events.colHidden'),
      type: 'boolean',
      width: 110,
      cellRenderer: (row) => <FlagChip on={row.hidden} onLabel={yes} offLabel={no} onColor="warning" />,
      valueGetter: (row) => yesNo(row.hidden),
    },
    dateColumn({ headerName: t('litePortal.common.created') }),
    { field: 'actions', headerName: t('litePortal.common.actions'), type: 'actions', width: 150, cellRenderer: renderActions },
  ];
}
