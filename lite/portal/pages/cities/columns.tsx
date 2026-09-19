import { actionsColumn, activeChipColumn, type DuncitColumn } from '@duncit/table';
import type { usePortalT } from '../../../shared/i18n';
import { FlagChip } from '../../components/FlagChip';
import type { LiteAdminCity } from '../../graphql/catalogue';

type Translate = ReturnType<typeof usePortalT>['t'];

export const cityRowId = (row: LiteAdminCity): string => row.id;
export const citySearchText = (row: LiteAdminCity): string => `${row.name} ${row.slug} ${row.country}`;

interface Handlers {
  onEdit: (row: LiteAdminCity) => void;
  onDelete: (row: LiteAdminCity) => void;
}

export function buildCityColumns(t: Translate, { onEdit, onDelete }: Handlers): DuncitColumn<LiteAdminCity>[] {
  const featured = t('litePortal.common.featured');
  const notFeatured = t('litePortal.common.notFeatured');
  return [
    { field: 'name', headerName: t('litePortal.common.name'), type: 'text', flex: 1, minWidth: 180 },
    { field: 'slug', headerName: t('litePortal.common.slug'), type: 'text', width: 150 },
    { field: 'country', headerName: t('litePortal.cities.colCountry'), type: 'text', width: 140 },
    {
      field: 'featured',
      headerName: t('litePortal.common.featured'),
      type: 'boolean',
      width: 140,
      cellRenderer: (row) => <FlagChip on={row.featured} onLabel={featured} offLabel={notFeatured} />,
      valueGetter: (row) => (row.featured ? featured : notFeatured),
    },
    { field: 'sort_order', headerName: t('litePortal.common.sortOrder'), type: 'number', width: 110 },
    activeChipColumn({ headerName: t('litePortal.common.status'), activeLabel: t('litePortal.common.active'), inactiveLabel: t('litePortal.common.inactive') }),
    { field: 'events_count', headerName: t('litePortal.common.events'), type: 'number', width: 100 },
    actionsColumn({
      headerName: t('litePortal.common.actions'),
      onEdit,
      onDelete,
      edit: { title: (row) => t('litePortal.common.edit', { vars: { name: row.name } }) },
      delete: { title: (row) => t('litePortal.common.delete', { vars: { name: row.name } }) },
    }),
  ];
}
