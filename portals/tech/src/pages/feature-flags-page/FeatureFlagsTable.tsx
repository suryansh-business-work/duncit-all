import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, IconButton, Stack, Switch, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { FeatureFlagRow } from './queries';

const getFlagRowId = (f: FeatureFlagRow) => f.id;

const renderKey = (f: FeatureFlagRow) => (
  <Typography variant="body2" fontWeight={600}>{f.key}</Typography>
);

const renderDescription = (f: FeatureFlagRow) => (
  <Typography variant="body2" color="text.secondary">{f.description || '—'}</Typography>
);

const renderType = (f: FeatureFlagRow) =>
  f.is_system ? <Chip size="small" label="System" color="info" /> : <Chip size="small" label="Custom" />;
const typeValue = (f: FeatureFlagRow) => (f.is_system ? 'System' : 'Custom');

const enabledValue = (f: FeatureFlagRow) => (f.enabled ? 'Yes' : 'No');

interface Props {
  fetchRows: TableFetch<FeatureFlagRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onToggle: (f: FeatureFlagRow) => void;
  onEdit: (f: FeatureFlagRow) => void;
  onRemove: (f: FeatureFlagRow) => void;
}

export default function FeatureFlagsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onToggle,
  onEdit,
  onRemove,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<FeatureFlagRow>[]>(() => {
    const renderEnabled = (f: FeatureFlagRow) => (
      <Switch size="small" checked={f.enabled} onChange={() => onToggle(f)} />
    );
    const renderActions = (f: FeatureFlagRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(f)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={f.is_system ? 'System (locked)' : 'Delete'}>
          <span>
            <IconButton size="small" disabled={f.is_system} onClick={() => onRemove(f)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
    return [
      {
        field: 'enabled',
        headerName: 'Enabled',
        width: 110,
        filter: { type: 'boolean' },
        cellRenderer: renderEnabled,
        valueGetter: enabledValue,
      },
      { field: 'key', headerName: 'Key', flex: 1, minWidth: 160, cellRenderer: renderKey },
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1.4,
        minWidth: 200,
        cellRenderer: renderDescription,
      },
      {
        field: 'is_system',
        headerName: 'Type',
        width: 110,
        filter: { type: 'boolean' },
        cellRenderer: renderType,
        valueGetter: typeValue,
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 120, cellRenderer: renderActions },
    ];
  }, [onEdit, onRemove, onToggle]);

  return (
    <DuncitTable<FeatureFlagRow>
      tableId="tech-feature-flags"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getFlagRowId}
      toolbarActions={toolbarActions}
      emptyText='No feature flags yet. Click "New Flag" to create the first one.'
      defaultSort={{ field: 'key', dir: 'asc' }}
      searchPlaceholder="Search key, name or description"
      refetchRef={refetchRef}
    />
  );
}
