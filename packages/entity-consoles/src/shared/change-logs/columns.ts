import type { DuncitColumn } from '@duncit/table';
import type { EntityChangeLogRow } from './queries';
import { actionOptions, actorOptions, sourceOptions } from './options';
import {
  actorValue,
  renderAction,
  renderActor,
  renderActorName,
  renderEntity,
  renderField,
  renderNew,
  renderOld,
  renderSource,
  whenValue,
} from './cells';

type Translate = (key: string) => string;

/**
 * The change-log columns.
 *
 * Entries are append-only, so a row is written once and never touched again:
 * only its creation time exists, and it is the column the server indexes.
 * `withEntity` prepends the record column, which the per-record tab does not
 * want (every row is the same record) and the console-wide feed does.
 */
export const changeLogColumns = (
  t: Translate,
  withEntity = false
): DuncitColumn<EntityChangeLogRow>[] => {
  const entityColumn: DuncitColumn<EntityChangeLogRow>[] = withEntity
    ? [
        {
          field: 'entity_label',
          headerName: t('directory.changeLogs.colRecord'),
          filter: { type: 'text' },
          flex: 1,
          minWidth: 180,
          cellRenderer: renderEntity,
          valueGetter: (row) => row.entity_label,
        },
      ]
    : [];

  return [
    ...entityColumn,
    {
      field: 'field_label',
      headerName: t('directory.changeLogs.colField'),
      filter: { type: 'text' },
      flex: 1,
      minWidth: 180,
      cellRenderer: renderField,
      valueGetter: (row) => row.field_label,
    },
    {
      field: 'old_value',
      headerName: t('directory.changeLogs.colOld'),
      sortable: false,
      flex: 1.5,
      minWidth: 180,
      cellRenderer: renderOld,
      valueGetter: (row) => row.old_value,
    },
    {
      field: 'new_value',
      headerName: t('directory.changeLogs.colNew'),
      sortable: false,
      flex: 1.5,
      minWidth: 180,
      cellRenderer: renderNew,
      valueGetter: (row) => row.new_value,
    },
    {
      field: 'action',
      headerName: t('directory.changeLogs.colAction'),
      filter: { type: 'select', options: actionOptions(t) },
      width: 120,
      cellRenderer: renderAction(t),
      valueGetter: (row) => row.action,
    },
    {
      field: 'created_at',
      headerName: t('directory.changeLogs.colWhen'),
      filter: { type: 'date' },
      minWidth: 190,
      valueGetter: whenValue,
    },
    {
      field: 'actor_type',
      headerName: t('directory.changeLogs.colBy'),
      filter: { type: 'select', options: actorOptions(t) },
      width: 130,
      cellRenderer: renderActor(t),
      valueGetter: (row) => row.actor_type,
    },
    {
      field: 'actor_name',
      headerName: t('directory.changeLogs.colByName'),
      flex: 1,
      minWidth: 200,
      cellRenderer: renderActorName,
      valueGetter: actorValue,
    },
    {
      field: 'source',
      headerName: t('directory.changeLogs.colSource'),
      filter: { type: 'select', options: sourceOptions(t) },
      width: 140,
      cellRenderer: renderSource(t),
      valueGetter: (row) => row.source,
    },
  ];
};
