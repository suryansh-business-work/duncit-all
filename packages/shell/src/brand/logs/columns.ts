import type { DuncitColumn } from '@duncit/table';
import type { Translate } from '../../i18n/fallback';
import type { BrandChangeLogRow } from './queries';
import { actionOptions, actorOptions, sourceOptions } from './options';
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
 * The brand log's columns — the same set every directory console's change log
 * shows. Entries are append-only, so only a creation time exists, and it is the
 * column the server indexes and the table sorts by.
 */
export const brandLogColumns = (t: Translate): DuncitColumn<BrandChangeLogRow>[] => [
  {
    field: 'created_at',
    headerName: t('shell.brandConsole.colWhen'),
    type: 'date',
    minWidth: 190,
    valueGetter: whenValue,
  },
  {
    field: 'field_label',
    headerName: t('shell.brandConsole.colField'),
    type: 'text',
    flex: 1,
    minWidth: 180,
    cellRenderer: renderField,
    valueGetter: (row) => row.field_label,
  },
  {
    field: 'old_value',
    headerName: t('shell.brandConsole.colOld'),
    type: 'text',
    flex: 1.5,
    minWidth: 180,
    cellRenderer: renderOld,
    valueGetter: (row) => row.old_value,
  },
  {
    field: 'new_value',
    headerName: t('shell.brandConsole.colNew'),
    type: 'text',
    flex: 1.5,
    minWidth: 180,
    cellRenderer: renderNew,
    valueGetter: (row) => row.new_value,
  },
  {
    field: 'action',
    headerName: t('shell.brandConsole.colAction'),
    type: 'enum',
    options: actionOptions(t),
    width: 120,
    cellRenderer: renderAction(t),
    valueGetter: (row) => row.action,
  },
  {
    field: 'actor_type',
    headerName: t('shell.brandConsole.colBy'),
    type: 'enum',
    options: actorOptions(t),
    width: 130,
    cellRenderer: renderActor(t),
    valueGetter: (row) => row.actor_type,
  },
  {
    field: 'actor_name',
    headerName: t('shell.brandConsole.colByName'),
    type: 'text',
    flex: 1,
    minWidth: 200,
    cellRenderer: renderActorName,
    valueGetter: actorValue,
  },
  {
    field: 'source',
    headerName: t('shell.brandConsole.colSource'),
    type: 'enum',
    options: sourceOptions(t),
    width: 140,
    cellRenderer: renderSource(t),
    valueGetter: (row) => row.source,
  },
];
