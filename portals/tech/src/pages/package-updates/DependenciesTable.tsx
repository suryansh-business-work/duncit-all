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
  <Typography variant="body2" fontWeight={600} noWrap title={row.name}>
    {row.name}
  </Typography>
);

/** Every range declared for this package. More than one is repo-wide drift. */
const renderRanges = (row: DependencyGroup) => (
  <Typography variant="body2" color="text.secondary" noWrap title={row.ranges}>
    {row.ranges}
  </Typography>
);

const renderLatest = (emptyText: string) => (row: DependencyGroup) => (
  <Typography variant="body2" fontWeight={row.latest ? 600 : 400} color={row.latest ? 'text.primary' : 'text.disabled'}>
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

  const filtered = useMemo(
    () => (type === ALL ? groups : groups.filter((row) => row.updateType === type)),
    [groups, type],
  );

  const fetchRows = useMemo(() => clientTableFetch(filtered, dependencySearchText), [filtered]);

  /**
   * The filter is applied to the ROWS above, not by the fetch — a client-side
   * fetch ignores query filters by design. This declares it to the table anyway
   * because that is what makes the table re-read and drop back to page 1; a
   * change it is never told about would leave it showing page 4 of a list that
   * no longer has one.
   */
  const externalFilters = useMemo<TableFilterValue[]>(
    () => [{ field: 'updateType', op: 'eq', value: type }],
    [type],
  );

  const columns = useMemo<DuncitColumn<DependencyGroup>[]>(
    () => [
      {
        field: 'name',
        headerName: t('tech.packageUpdates.dependency'),
        flex: 1,
        minWidth: 220,
        cellRenderer: renderName,
      },
      {
        field: 'ranges',
        headerName: t('tech.packageUpdates.declared'),
        flex: 1,
        minWidth: 180,
        cellRenderer: renderRanges,
      },
      {
        field: 'latest',
        headerName: t('tech.packageUpdates.latest'),
        width: 150,
        cellRenderer: renderLatest(noLatest),
      },
      {
        field: 'updateType',
        headerName: t('shell.common.type'),
        width: 150,
        cellRenderer: renderType,
      },
      {
        field: 'usedIn',
        headerName: t('tech.packageUpdates.usedIn'),
        width: 120,
        cellRenderer: renderUsedIn,
      },
    ],
    [t, noLatest],
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
