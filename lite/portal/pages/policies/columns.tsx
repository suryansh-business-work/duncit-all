import { actionsColumn, activeChipColumn, type DuncitColumn } from '@duncit/table';
import type { usePortalT } from '../../../shared/i18n';
import type { LiteAdminPolicy } from '../../graphql/policies';

type Translate = ReturnType<typeof usePortalT>['t'];

export const policyRowId = (row: LiteAdminPolicy): string => row.id;
export const policySearchText = (row: LiteAdminPolicy): string => `${row.title} ${row.slug}`;

interface Handlers {
  onEdit: (row: LiteAdminPolicy) => void;
  onDelete: (row: LiteAdminPolicy) => void;
}

export function buildPolicyColumns(t: Translate, { onEdit, onDelete }: Handlers): DuncitColumn<LiteAdminPolicy>[] {
  return [
    { field: 'title', headerName: t('litePortal.policies.titleLabel'), type: 'text', flex: 1, minWidth: 200 },
    { field: 'slug', headerName: t('litePortal.common.slug'), type: 'text', width: 200, valueGetter: (row) => `/legal/${row.slug}` },
    { field: 'sort_order', headerName: t('litePortal.common.sortOrder'), type: 'number', width: 110 },
    activeChipColumn({ headerName: t('litePortal.common.status'), activeLabel: t('litePortal.common.active'), inactiveLabel: t('litePortal.common.inactive') }),
    actionsColumn({
      headerName: t('litePortal.common.actions'),
      onEdit,
      onDelete,
      edit: { title: (row) => t('litePortal.common.edit', { vars: { name: row.title } }) },
      delete: { title: (row) => t('litePortal.common.delete', { vars: { name: row.title } }) },
    }),
  ];
}
