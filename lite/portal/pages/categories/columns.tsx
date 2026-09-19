import { actionsColumn, activeChipColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { usePortalT } from '../../../shared/i18n';
import type { LiteAdminCategory } from '../../graphql/catalogue';

type Translate = ReturnType<typeof usePortalT>['t'];

export const categoryRowId = (row: LiteAdminCategory): string => row.id;
export const categorySearchText = (row: LiteAdminCategory): string => `${row.name} ${row.slug}`;

interface Handlers {
  onEdit: (row: LiteAdminCategory) => void;
  onDelete: (row: LiteAdminCategory) => void;
}

export function buildCategoryColumns(t: Translate, { onEdit, onDelete }: Handlers): DuncitColumn<LiteAdminCategory>[] {
  return [
    { field: 'name', headerName: t('litePortal.common.name'), type: 'text', flex: 1, minWidth: 180 },
    { field: 'slug', headerName: t('litePortal.common.slug'), type: 'text', width: 160 },
    { field: 'icon', headerName: t('litePortal.categories.colIcon'), type: 'text', width: 150, valueGetter: (row) => row.icon ?? EM_DASH },
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
