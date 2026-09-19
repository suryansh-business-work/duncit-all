import type { ReactNode } from 'react';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import type { usePortalT } from '../../../shared/i18n';
import { FlagChip } from '../../components/FlagChip';
import type { LiteAdminUserRow } from '../../graphql/users';

type Translate = ReturnType<typeof usePortalT>['t'];

export const userRowId = (row: LiteAdminUserRow): string => row.id;

/** `duncit_linked` and `events_hosted` have no stored sort or filter path on the server. */
export function buildUserColumns(t: Translate, renderActions: (row: LiteAdminUserRow) => ReactNode): DuncitColumn<LiteAdminUserRow>[] {
  const linked = t('litePortal.users.linked');
  const notLinked = t('litePortal.users.notLinked');
  const admin = t('litePortal.users.admin');
  const member = t('litePortal.users.member');
  const blocked = t('litePortal.users.blocked');
  const ok = t('litePortal.users.ok');
  return [
    { field: 'name', headerName: t('litePortal.users.colName'), type: 'text', flex: 1, minWidth: 180 },
    { field: 'email', headerName: t('litePortal.users.colEmail'), type: 'text', flex: 1, minWidth: 220 },
    { field: 'handle', headerName: t('litePortal.users.colHandle'), type: 'text', width: 160, valueGetter: (row) => `@${row.handle}` },
    {
      field: 'duncit_linked',
      headerName: t('litePortal.users.colDuncit'),
      type: 'boolean',
      width: 140,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <FlagChip on={row.duncit_linked} onLabel={linked} offLabel={notLinked} onColor="info" />,
      valueGetter: (row) => (row.duncit_linked ? linked : notLinked),
    },
    {
      field: 'is_admin',
      headerName: t('litePortal.users.colAdmin'),
      type: 'boolean',
      width: 120,
      cellRenderer: (row) => <FlagChip on={row.is_admin} onLabel={admin} offLabel={member} onColor="primary" />,
      valueGetter: (row) => (row.is_admin ? admin : member),
    },
    {
      field: 'is_blocked',
      headerName: t('litePortal.users.colBlocked'),
      type: 'boolean',
      width: 120,
      cellRenderer: (row) => <FlagChip on={row.is_blocked} onLabel={blocked} offLabel={ok} onColor="error" />,
      valueGetter: (row) => (row.is_blocked ? blocked : ok),
    },
    { field: 'events_hosted', headerName: t('litePortal.users.colHosted'), type: 'number', width: 100, hide: true, sortable: false, filterable: false },
    dateColumn({ headerName: t('litePortal.common.created'), hide: false }),
    { field: 'actions', headerName: t('litePortal.common.actions'), type: 'actions', width: 110, cellRenderer: renderActions },
  ];
}
