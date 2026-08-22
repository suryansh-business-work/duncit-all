import { useEffect, useMemo, useRef } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { packageSearchText, type PackageUpdate } from './queries';

const getRowId = (row: PackageUpdate) => row.path;

type CountTone = 'error' | 'warning' | 'info' | 'text.primary';

/**
 * A count that only draws attention when there is something to count.
 *
 * Module scope: a component declared inside the table would be a fresh type on
 * every render, which remounts the cell (S6478).
 */
function CountCell({ value, tone }: Readonly<{ value: number; tone: CountTone }>) {
  return (
    <Typography variant="body2" fontWeight={value > 0 ? 700 : 400} color={value > 0 ? tone : 'text.disabled'}>
      {value}
    </Typography>
  );
}

function NameCell({ row, privateLabel }: Readonly<{ row: PackageUpdate; privateLabel: string }>) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
      <Typography variant="body2" fontWeight={600} noWrap title={row.name}>
        {row.name}
      </Typography>
      {row.private && <Chip size="small" variant="outlined" label={privateLabel} />}
    </Stack>
  );
}

const renderPath = (row: PackageUpdate) => (
  <Typography variant="body2" color="text.secondary" noWrap title={row.path}>
    {row.path}
  </Typography>
);

interface Props {
  packages: readonly PackageUpdate[];
  onOpen: (pkg: PackageUpdate) => void;
}

/**
 * One row per `package.json`, so "which surface is furthest behind" is answered
 * before anyone opens a dependency list.
 */
export default function PackagesTable({ packages, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  const privateLabel = t('tech.packageUpdates.privateManifest');

  const fetchRows = useMemo(
    () => clientTableFetch(packages, packageSearchText),
    [packages],
  );

  // The report arrives after the table mounts, and the table holds its own copy
  // of the last page it fetched — without this it would keep showing the empty
  // one it was born with.
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  const columns = useMemo<DuncitColumn<PackageUpdate>[]>(
    () => [
      {
        field: 'name',
        headerName: t('shell.common.name'),
        flex: 1,
        minWidth: 200,
        cellRenderer: (row) => <NameCell row={row} privateLabel={privateLabel} />,
      },
      {
        field: 'path',
        headerName: t('tech.packageUpdates.path'),
        flex: 1.4,
        minWidth: 240,
        cellRenderer: renderPath,
      },
      { field: 'total', headerName: t('tech.packageUpdates.declaredCount'), width: 120 },
      {
        field: 'outdated',
        headerName: t('tech.packageUpdates.outdated'),
        width: 120,
        cellRenderer: (row) => <CountCell value={row.outdated} tone="text.primary" />,
      },
      {
        field: 'major',
        headerName: t('tech.packageUpdates.major'),
        width: 110,
        cellRenderer: (row) => <CountCell value={row.major} tone="error" />,
      },
      {
        field: 'minor',
        headerName: t('tech.packageUpdates.minor'),
        width: 110,
        cellRenderer: (row) => <CountCell value={row.minor} tone="warning" />,
      },
      {
        field: 'patch',
        headerName: t('tech.packageUpdates.patch'),
        width: 110,
        cellRenderer: (row) => <CountCell value={row.patch} tone="info" />,
      },
    ],
    [t, privateLabel],
  );

  return (
    <DuncitTable<PackageUpdate>
      tableId="tech-package-manifests"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      refetchRef={refetchRef}
      onRowClick={onOpen}
      defaultSort={{ field: 'outdated', dir: 'desc' }}
      emptyText={t('tech.packageUpdates.noManifests')}
      searchPlaceholder={t('tech.packageUpdates.searchManifests')}
    />
  );
}
