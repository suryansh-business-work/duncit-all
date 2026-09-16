import { useMemo } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import UpdateTypeChip from './UpdateTypeChip';
import {
  compareBySeverity,
  dependencyRowSearchText,
  kindLabel,
  kindOptions,
  updateTypeOptions,
  type DependencyUpdate,
  type PackageUpdate,
} from './queries';

const getRowId = (row: DependencyUpdate) => `${row.kind}:${row.name}`;

const renderName = (row: DependencyUpdate) => (
  <Typography variant="body2" noWrap title={row.name} sx={{
    fontWeight: 600
  }}>
    {row.name}
  </Typography>
);

const renderRange = (row: DependencyUpdate) => (
  <Typography variant="body2" sx={{
    color: "text.secondary"
  }}>
    {row.range}
  </Typography>
);

const renderLatest = (emptyText: string) => (row: DependencyUpdate) => (
  <Typography variant="body2" color={row.latest ? 'text.primary' : 'text.secondary'}>
    {row.latest ?? emptyText}
  </Typography>
);

const renderType = (row: DependencyUpdate) => <UpdateTypeChip type={row.updateType} />;

interface Props {
  pkg: PackageUpdate | null;
  onClose: () => void;
}

/**
 * Everything ONE manifest declares, worst first.
 *
 * The severity order is applied to the list itself, so an unsorted table opens
 * on the question a manifest is opened with — "what in here is behind" — and
 * alphabetical would bury it.
 */
export default function PackageDepsDialog({ pkg, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const noLatest = t('tech.packageUpdates.notPublished');

  const columns = useMemo<DuncitColumn<DependencyUpdate>[]>(
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
        field: 'kind',
        headerName: t('tech.packageUpdates.kind'),
        width: 130,
        type: 'enum',
        options: kindOptions(t),
        valueGetter: (row) => kindLabel(t, row.kind),
      },
      {
        field: 'range',
        headerName: t('tech.packageUpdates.declared'),
        width: 160,
        type: 'text',
        cellRenderer: renderRange,
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
    ],
    [t, noLatest],
  );

  // The dialog's children unmount on close, so every open is a fresh mount and
  // the table reads the manifest it was opened for. There is no second manifest
  // to switch to without closing this one.
  const rows = useMemo(() => (pkg ? [...pkg.dependencies].sort(compareBySeverity) : []), [pkg]);
  const fetchRows = useMemo(
    () => clientTableFetch(rows, dependencyRowSearchText, columns),
    [rows, columns],
  );

  return (
    <Dialog open={pkg != null} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        <Stack spacing={0.25}>
          <Typography variant="h6" sx={{
            fontWeight: 800
          }}>
            {pkg?.name}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {pkg?.path}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <DuncitTable<DependencyUpdate>
          tableId="tech-package-manifest-deps"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getRowId}
          emptyText={t('tech.packageUpdates.noDependencies')}
          searchPlaceholder={t('tech.packageUpdates.searchDependencies')}
        />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
