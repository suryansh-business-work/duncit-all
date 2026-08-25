import { useMemo } from 'react';
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

/**
 * The cell renderers, out here with the components they render.
 *
 * An arrow returning JSX is a component wherever it is written, so building
 * these inside the table meant five fresh component types on every render —
 * the same remount S6478 is about, one level up from the components
 * themselves. `renderName` is a factory because the private-manifest chip is
 * translated, and the copy is only known once the hook has run.
 */
const renderName = (privateLabel: string) => (row: PackageUpdate) => (
  <NameCell row={row} privateLabel={privateLabel} />
);
const renderOutdated = (row: PackageUpdate) => <CountCell value={row.outdated} tone="text.primary" />;
const renderMajor = (row: PackageUpdate) => <CountCell value={row.major} tone="error" />;
const renderMinor = (row: PackageUpdate) => <CountCell value={row.minor} tone="warning" />;
const renderPatch = (row: PackageUpdate) => <CountCell value={row.patch} tone="info" />;

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
  const privateLabel = t('tech.packageUpdates.privateManifest');

  // The table reads this once, on mount. A new sweep remounts it by key rather
  // than pushing rows in — see the `key` the page gives this component.
  const fetchRows = useMemo(() => clientTableFetch(packages, packageSearchText), [packages]);

  const columns = useMemo<DuncitColumn<PackageUpdate>[]>(
    () => [
      {
        field: 'name',
        headerName: t('shell.common.name'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderName(privateLabel),
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
        cellRenderer: renderOutdated,
      },
      {
        field: 'major',
        headerName: t('tech.packageUpdates.major'),
        width: 110,
        cellRenderer: renderMajor,
      },
      {
        field: 'minor',
        headerName: t('tech.packageUpdates.minor'),
        width: 110,
        cellRenderer: renderMinor,
      },
      {
        field: 'patch',
        headerName: t('tech.packageUpdates.patch'),
        width: 110,
        cellRenderer: renderPatch,
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
      onRowClick={onOpen}
      defaultSort={{ field: 'outdated', dir: 'desc' }}
      emptyText={t('tech.packageUpdates.noManifests')}
      searchPlaceholder={t('tech.packageUpdates.searchManifests')}
    />
  );
}
