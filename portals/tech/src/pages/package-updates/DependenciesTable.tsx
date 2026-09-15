import { useMemo, useState } from 'react';
import { MenuItem, TextField, Typography } from '@mui/material';
import { DuncitTable, clientTableFetch, type DuncitColumn, type TableFilterValue } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import UpdateTypeChip from './UpdateTypeChip';
import {
  dependencySearchText,
  updateTypeOptions,
  type DependencyGroup,
  type UpdateType,
} from './queries';

const ALL = 'ALL';

const getRowId = (row: DependencyGroup) => row.name;

const renderName = (row: DependencyGroup) => (
  <Typography variant="body2" noWrap title={row.name} sx={{
    fontWeight: 600
  }}>
    {row.name}
  </Typography>
);

/** Every range declared for this package. More than one is repo-wide drift. */
const renderRanges = (row: DependencyGroup) => (
  <Typography variant="body2" noWrap title={row.ranges} sx={{
    color: "text.secondary"
  }}>
    {row.ranges}
  </Typography>
);

const renderLatest = (emptyText: string) => (row: DependencyGroup) => (
  <Typography variant="body2" color={row.latest ? 'text.primary' : 'text.secondary'} sx={{
    fontWeight: row.latest ? 600 : 400
  }}>
    {row.latest ?? emptyText}
  </Typography>
);

const renderType = (row: DependencyGroup) => <UpdateTypeChip type={row.updateType} />;

/** The count, with the manifests themselves as the tooltip. */
const renderUsedIn = (row: DependencyGroup) => (
  <Typography variant="body2" title={row.paths}>
    {row.usedIn}
  </Typography>
);

/**
 * One row per dependency NAME across the whole repo — the view that answers
 * "what is there to upgrade", as opposed to "which manifest is behind".
 */
export default function DependenciesTable({ groups }: Readonly<{ groups: readonly DependencyGroup[] }>) {
  const { t } = useTranslation();
  const [type, setType] = useState<UpdateType | typeof ALL>(ALL);
  const noLatest = t('tech.packageUpdates.notPublished');

  /**
   * The toolbar's type picker, as a pinned filter the fetch applies — which is
   * also what makes the table re-read and drop back to page 1 when it changes.
   * "All" pins nothing.
   */
  const externalFilters = useMemo<TableFilterValue[]>(
    () => (type === ALL ? [] : [{ field: 'updateType', op: 'eq', value: type }]),
    [type],
  );

  const columns = useMemo<DuncitColumn<DependencyGroup>[]>(
    () => [
      {
        field: 'name',
        headerName: t('tech.packageUpdates.dependency'),
        flex: 1,
        minWidth: 220,
        type: 'text',
        cellRenderer: renderName,
      },
      {
        field: 'ranges',
        headerName: t('tech.packageUpdates.declared'),
        flex: 1,
        minWidth: 180,
        type: 'text',
        cellRenderer: renderRanges,
      },
      {
        field: 'latest',
        headerName: t('tech.packageUpdates.latest'),
        width: 150,
        type: 'text',
        cellRenderer: renderLatest(noLatest),
      },
      {
        field: 'updateType',
        headerName: t('shell.common.type'),
        width: 150,
        type: 'enum',
        options: updateTypeOptions(t),
        cellRenderer: renderType,
      },
      {
        field: 'usedIn',
        headerName: t('tech.packageUpdates.usedIn'),
        width: 120,
        type: 'number',
        cellRenderer: renderUsedIn,
      },
    ],
    [t, noLatest],
  );

  const fetchRows = useMemo(
    () => clientTableFetch(groups, dependencySearchText, columns),
    [groups, columns],
  );

  const filterControl = (
    <TextField
      select
      size="small"
      label={t('shell.common.type')}
      value={type}
      onChange={(event) => setType(event.target.value as UpdateType | typeof ALL)}
      sx={{ minWidth: 180 }}
    >
      <MenuItem value={ALL}>{t('tech.packageUpdates.allTypes')}</MenuItem>
      {updateTypeOptions(t).map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <DuncitTable<DependencyGroup>
      tableId="tech-package-dependencies"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      externalFilters={externalFilters}
      toolbarActions={filterControl}
      emptyText={t('tech.packageUpdates.noDependencies')}
      searchPlaceholder={t('tech.packageUpdates.searchDependencies')}
    />
  );
}
