import { useCallback, useMemo, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, EM_DASH, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatDuration } from '../format';
import { optionsOf, useUnitLabels } from '../labels';
import type { UnitFileRow } from '../queries';
import { makeStatusCell } from './StatusChip';
import FileDialog from './FileDialog';

interface Props {
  tableId: string;
  fetchRows: TableFetch<UnitFileRow>;
}

const getRowId = (row: UnitFileRow) => row.id;

/** The first two mocked names, and how many more — the dialog lists them all. */
function renderMocks(row: UnitFileRow) {
  const names = [...row.mocks, ...row.gql_mocks];
  if (names.length === 0) return <Typography variant="body2">{EM_DASH}</Typography>;
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
      {names.slice(0, 2).map((name) => (
        <Chip key={name} size="small" variant="outlined" label={name} />
      ))}
      {names.length > 2 && <Chip size="small" label={`+${names.length - 2}`} />}
    </Stack>
  );
}

/**
 * A run's test files: what kind each is, how it went, and what it mocks. Every
 * column filters server-side; "has mocks" is a hidden yes/no column so it can
 * be filtered without taking room.
 */
export default function FilesTable({ tableId, fetchRows }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useUnitLabels();
  const [open, setOpen] = useState<UnitFileRow | null>(null);
  const close = useCallback(() => setOpen(null), []);

  const columns = useMemo<DuncitColumn<UnitFileRow>[]>(
    () => [
      { field: 'path', headerName: t('testsUnit.col.file'), minWidth: 320, flex: 2, type: 'text', valueGetter: (r) => r.path },
      { field: 'workspace', headerName: t('testsUnit.col.workspace'), minWidth: 160, type: 'text', valueGetter: (r) => r.workspace },
      {
        field: 'kind',
        headerName: t('testsUnit.col.kind'),
        width: 170,
        type: 'enum',
        options: optionsOf(labels.fileKind),
        valueGetter: (r) => labels.fileKind[r.kind],
      },
      {
        field: 'status',
        headerName: t('testsUnit.col.status'),
        width: 130,
        type: 'enum',
        options: optionsOf(labels.fileStatus),
        cellRenderer: makeStatusCell<UnitFileRow>(labels.fileStatus, (r) => r.status),
        valueGetter: (r) => labels.fileStatus[r.status],
      },
      { field: 'tests', headerName: t('testsUnit.col.tests'), width: 100, type: 'number', valueGetter: (r) => r.tests },
      { field: 'failed', headerName: t('testsUnit.col.failed'), width: 100, type: 'number', valueGetter: (r) => r.failed },
      {
        field: 'mock_count',
        headerName: t('testsUnit.col.mocks'),
        minWidth: 240,
        flex: 1,
        type: 'number',
        cellRenderer: renderMocks,
        valueGetter: (r) => r.mock_count,
      },
      {
        field: 'has_mocks',
        headerName: t('testsUnit.col.hasMocks'),
        width: 120,
        hide: true,
        type: 'boolean',
        valueGetter: (r) => (r.mock_count > 0 ? t('testsUnit.common.yes') : t('testsUnit.common.no')),
      },
      {
        field: 'duration_ms',
        headerName: t('testsUnit.col.duration'),
        width: 110,
        type: 'number',
        valueGetter: (r) => formatDuration(t, r.duration_ms),
      },
    ],
    [labels, t]
  );

  return (
    <>
      <DuncitTable<UnitFileRow>
        ariaLabel={t('testsUnit.files.title')}
        tableId={tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('testsUnit.files.empty')}
        searchPlaceholder={t('testsUnit.files.search')}
        defaultSort={{ field: 'mock_count', dir: 'desc' }}
        onRowClick={setOpen}
      />
      <FileDialog file={open} onClose={close} />
    </>
  );
}
