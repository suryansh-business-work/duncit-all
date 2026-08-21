import type { DuncitColumn } from '@duncit/table';
import type { UserChangeLogRow } from '../queries';
import { ACTION_OPTIONS, ACTOR_OPTIONS, SOURCE_OPTIONS } from './options';
import {
  actorValue,
  renderAction,
  renderActor,
  renderActorName,
  renderField,
  renderNew,
  renderOld,
  renderSource,
  whenValue,
} from './cells';

/**
 * The change-log columns, in the order the spec asks for them.
 *
 * Entries are append-only, so a row is written once and never touched again:
 * "Created Date" and "Last Updated Date" are both the moment the change was
 * recorded. Only the first is sortable/filterable — it is the one the server
 * indexes.
 */
export const CHANGE_LOG_COLUMNS: DuncitColumn<UserChangeLogRow>[] = [
  {
    field: 'field_label',
    headerName: 'Field / Data Name',
    filter: { type: 'text' },
    flex: 1,
    minWidth: 180,
    cellRenderer: renderField,
    valueGetter: (row) => row.field_label,
  },
  {
    field: 'old_value',
    headerName: 'Old Data',
    sortable: false,
    flex: 1.5,
    minWidth: 180,
    cellRenderer: renderOld,
    valueGetter: (row) => row.old_value,
  },
  {
    field: 'new_value',
    headerName: 'New Data',
    sortable: false,
    flex: 1.5,
    minWidth: 180,
    cellRenderer: renderNew,
    valueGetter: (row) => row.new_value,
  },
  {
    field: 'action',
    headerName: 'Action',
    filter: { type: 'select', options: ACTION_OPTIONS },
    width: 120,
    cellRenderer: renderAction,
    valueGetter: (row) => row.action,
  },
  {
    field: 'created_at',
    headerName: 'Created Date',
    filter: { type: 'date' },
    minWidth: 190,
    valueGetter: whenValue,
  },
  {
    field: 'updated_at',
    headerName: 'Last Updated Date',
    sortable: false,
    minWidth: 190,
    valueGetter: whenValue,
  },
  {
    field: 'actor_type',
    headerName: 'Updated By',
    filter: { type: 'select', options: ACTOR_OPTIONS },
    width: 130,
    cellRenderer: renderActor,
    valueGetter: (row) => row.actor_type,
  },
  {
    field: 'actor_name',
    headerName: 'Updated By Name / ID',
    flex: 1,
    minWidth: 200,
    cellRenderer: renderActorName,
    valueGetter: actorValue,
  },
  {
    field: 'source',
    headerName: 'Source',
    filter: { type: 'select', options: SOURCE_OPTIONS },
    width: 140,
    cellRenderer: renderSource,
    valueGetter: (row) => row.source,
  },
];
