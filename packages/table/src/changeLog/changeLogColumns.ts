import { formatDateTime } from '@duncit/datetime';
import { EM_DASH } from '../cells/shared';
import type { Translate } from '../i18n';
import type { DuncitColumn } from '../types';
import type { TableChangeAction, TableChangeLogRow } from './changeLogContext';

const orDash = (value: string) => value || EM_DASH;

const actionLabels = (t: Translate): Record<TableChangeAction, string> => ({
  CREATE: t('shell.table.changeLogCreated'),
  UPDATE: t('shell.table.changeLogUpdated'),
  DELETE: t('shell.table.changeLogDeleted'),
});

/** The columns of a change log; `detailed` adds who-by contact, surface, address and browser. */
export function changeLogColumns(t: Translate, detailed: boolean): DuncitColumn<TableChangeLogRow>[] {
  const actions = actionLabels(t);
  const columns: DuncitColumn<TableChangeLogRow>[] = [
    {
      field: 'created_at',
      headerName: t('shell.table.changeLogWhen'),
      type: 'date',
      width: 180,
      valueGetter: (row) => formatDateTime(row.created_at) || EM_DASH,
    },
    {
      field: 'actor_name',
      headerName: t('shell.table.changeLogWho'),
      type: 'text',
      minWidth: 160,
      flex: 1,
      valueGetter: (row) => orDash(row.actor_name || row.actor_email),
    },
    {
      field: 'action',
      headerName: t('shell.table.changeLogAction'),
      type: 'enum',
      options: (Object.keys(actions) as TableChangeAction[]).map((value) => ({ value, label: actions[value] })),
      width: 120,
      valueGetter: (row) => actions[row.action],
    },
    {
      field: 'doc_id',
      headerName: t('shell.table.changeLogRecord'),
      type: 'text',
      width: 210,
    },
    { field: 'field', headerName: t('shell.table.changeLogField'), type: 'text', width: 180, valueGetter: (row) => orDash(row.field) },
    { field: 'old_value', headerName: t('shell.table.changeLogOld'), type: 'text', minWidth: 160, flex: 1, sortable: false, valueGetter: (row) => orDash(row.old_value) },
    { field: 'new_value', headerName: t('shell.table.changeLogNew'), type: 'text', minWidth: 160, flex: 1, sortable: false, valueGetter: (row) => orDash(row.new_value) },
  ];
  if (!detailed) return columns;
  return [
    ...columns,
    { field: 'actor_email', headerName: t('shell.table.changeLogEmail'), type: 'text', width: 200, valueGetter: (row) => orDash(row.actor_email) },
    {
      field: 'actor_roles',
      headerName: t('shell.table.changeLogRoles'),
      type: 'text',
      width: 180,
      sortable: false,
      filterable: false,
      valueGetter: (row) => orDash(row.actor_roles.join(', ')),
    },
    { field: 'source', headerName: t('shell.table.changeLogSource'), type: 'text', width: 130, filterable: false },
    { field: 'ip', headerName: t('shell.table.changeLogIp'), type: 'text', width: 140, sortable: false, filterable: false, valueGetter: (row) => orDash(row.ip) },
    {
      field: 'user_agent',
      headerName: t('shell.table.changeLogBrowser'),
      type: 'text',
      width: 240,
      sortable: false,
      filterable: false,
      valueGetter: (row) => orDash(row.user_agent),
    },
  ];
}
