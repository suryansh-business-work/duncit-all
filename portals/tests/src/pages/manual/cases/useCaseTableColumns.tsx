import { useMemo, type ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { CaseTypeIcon } from '../../../components/manual/CaseTypeIcon';
import { CategoryChip } from '../../../components/manual/CategoryChip';
import { PersonAvatar } from '../../../components/manual/PersonAvatar';
import { PriorityIcon } from '../../../components/manual/PriorityIcon';
import { useCaseOptions, useColumnOptions } from '../shared/useCaseOptions';
import { ENVIRONMENT_KEYS, PRIORITY_KEYS, TYPE_KEYS } from '../shared/vocabulary';
import type { ManualRow } from '../shared/types';

const iconAndText = (icon: ReactNode, text: string) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
    {icon}
    <Typography variant="body2" noWrap>
      {text}
    </Typography>
  </Stack>
);

/** The Cases table's columns; every pick-list column filters by the same options the forms use. */
export function useCaseTableColumns(): DuncitColumn<ManualRow>[] {
  const { t } = useTranslation();
  const options = useCaseOptions();
  const columns = useColumnOptions();
  const surfaceName = useMemo(() => new Map(options.surfaces.map((o) => [o.value, o.label])), [options.surfaces]);

  return useMemo<DuncitColumn<ManualRow>[]>(
    () => [
      { field: 'key', headerName: t('testsManual.field.key'), width: 110, type: 'text', valueGetter: (row) => row.key },
      { field: 'title', headerName: t('testsManual.field.title'), flex: 1, minWidth: 240, type: 'text' },
      {
        field: 'type',
        headerName: t('testsManual.field.type'),
        width: 150,
        type: 'enum',
        options: options.types,
        valueGetter: (row) => t(TYPE_KEYS[row.type]),
        cellRenderer: (row) => iconAndText(<CaseTypeIcon type={row.type} />, t(TYPE_KEYS[row.type])),
      },
      {
        field: 'priority',
        headerName: t('testsManual.field.priority'),
        width: 140,
        type: 'enum',
        options: options.priorities,
        valueGetter: (row) => t(PRIORITY_KEYS[row.priority]),
        cellRenderer: (row) => iconAndText(<PriorityIcon priority={row.priority} />, t(PRIORITY_KEYS[row.priority])),
      },
      {
        // Ordered by the board, not alphabetically — so not sortable here.
        field: 'column_id',
        headerName: t('testsManual.field.status'),
        width: 160,
        type: 'enum',
        options: columns,
        sortable: false,
        valueGetter: (row) => row.column?.name ?? EM_DASH,
        cellRenderer: (row) =>
          row.column ? <CategoryChip category={row.column.category} label={row.column.name} /> : EM_DASH,
      },
      {
        field: 'assignee_id',
        headerName: t('testsManual.field.assignee'),
        width: 190,
        type: 'enum',
        options: options.people,
        sortable: false,
        valueGetter: (row) => row.assignee?.name ?? t('testsManual.card.unassigned'),
        cellRenderer: (row) =>
          row.assignee
            ? iconAndText(<PersonAvatar person={row.assignee} />, row.assignee.name)
            : t('testsManual.card.unassigned'),
      },
      {
        field: 'surface',
        headerName: t('testsManual.field.surface'),
        width: 160,
        type: 'enum',
        options: options.surfaces,
        valueGetter: (row) => (row.surface ? (surfaceName.get(row.surface) ?? row.surface) : EM_DASH),
      },
      {
        field: 'environment',
        headerName: t('testsManual.field.environment'),
        width: 130,
        type: 'enum',
        options: options.environments,
        valueGetter: (row) => t(ENVIRONMENT_KEYS[row.environment]),
      },
      {
        field: 'labels',
        headerName: t('testsManual.field.labels'),
        width: 180,
        type: 'text',
        sortable: false,
        hide: true,
        valueGetter: (row) => row.labels.join(', ') || EM_DASH,
      },
      dateColumn<ManualRow>({ field: 'updated_at', headerName: t('shell.common.updated'), hide: false, width: 165 }),
    ],
    [columns, options, surfaceName, t]
  );
}
