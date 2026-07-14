import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ScienceIcon from '@mui/icons-material/Science';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveIcon from '@mui/icons-material/Remove';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { EnvEntry } from './queries';

function LastTested({ entry }: Readonly<{ entry: EnvEntry }>) {
  if (entry.last_test_ok == null || !entry.last_tested_at) {
    return <Tooltip title="Not tested yet"><RemoveIcon fontSize="small" color="disabled" /></Tooltip>;
  }
  const when = new Date(entry.last_tested_at).toLocaleString();
  return entry.last_test_ok ? (
    <Tooltip title={`Passed · ${when}`}><CheckCircleIcon fontSize="small" color="success" /></Tooltip>
  ) : (
    <Tooltip title={`Failed · ${when}`}><CancelIcon fontSize="small" color="error" /></Tooltip>
  );
}

const getEnvEntryRowId = (e: EnvEntry) => e.id;

const renderName = (e: EnvEntry) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="div">{e.name}</Typography>
    <Typography variant="caption" color="text.secondary" component="div">{e.description}</Typography>
  </Box>
);
const nameValue = (e: EnvEntry) => e.name;

const renderStatus = (e: EnvEntry) => (
  <Stack direction="row" spacing={0.5} component="span">
    {e.is_default && <Chip size="small" color="primary" label="Default" />}
    <Chip size="small" variant="outlined" color={e.is_active ? 'success' : 'default'} label={e.is_active ? 'Active' : 'Off'} />
  </Stack>
);
const statusValue = (e: EnvEntry) =>
  [e.is_default ? 'Default' : '', e.is_active ? 'Active' : 'Off'].filter(Boolean).join(' ');

const renderLastTested = (e: EnvEntry) => <LastTested entry={e} />;
const lastTestedValue = (e: EnvEntry) => {
  if (e.last_test_ok == null || !e.last_tested_at) return 'Never';
  const when = new Date(e.last_tested_at).toLocaleString();
  return e.last_test_ok ? `Passed · ${when}` : `Failed · ${when}`;
};

const renderPortals = (e: EnvEntry) =>
  e.assigned_portals.length
    ? <Typography variant="caption">{e.assigned_portals.join(', ')}</Typography>
    : <Typography variant="caption" color="text.secondary">—</Typography>;
const portalsValue = (e: EnvEntry) => e.assigned_portals.join(', ');

interface Props {
  fetchRows: TableFetch<EnvEntry>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (e: EnvEntry) => void;
  onDelete: (e: EnvEntry) => void;
  onSetDefault: (e: EnvEntry) => void;
  onTest: (e: EnvEntry) => void;
}

export default function EnvEntriesTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
  onSetDefault,
  onTest,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<EnvEntry>[]>(() => {
    const renderActions = (e: EnvEntry) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title="Test connection"><IconButton size="small" onClick={() => onTest(e)}><ScienceIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(e)}><EditIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Set default"><IconButton size="small" onClick={() => onSetDefault(e)}>{e.is_default ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}</IconButton></Tooltip>
        <Tooltip title="Delete"><IconButton size="small" onClick={() => onDelete(e)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>
    );
    return [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 200, cellRenderer: renderName, valueGetter: nameValue },
      {
        field: 'is_active',
        headerName: 'Status',
        width: 150,
        filter: { type: 'boolean' },
        cellRenderer: renderStatus,
        valueGetter: statusValue,
      },
      { field: 'is_default', headerName: 'Default', hide: true, width: 100, filter: { type: 'boolean' } },
      {
        field: 'last_tested_at',
        headerName: 'Last tested',
        width: 120,
        cellRenderer: renderLastTested,
        valueGetter: lastTestedValue,
      },
      { field: 'last_test_ok', headerName: 'Test result', hide: true, width: 110, filter: { type: 'boolean' } },
      {
        field: 'assigned_portals',
        headerName: 'Assigned portals',
        sortable: false,
        filter: { type: 'text' },
        flex: 1,
        minWidth: 160,
        cellRenderer: renderPortals,
        valueGetter: portalsValue,
      },
      { field: 'created_at', headerName: 'Created', hide: true, width: 130, filter: { type: 'date' } },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 170, cellRenderer: renderActions },
    ];
  }, [onDelete, onEdit, onSetDefault, onTest]);

  return (
    <DuncitTable<EnvEntry>
      tableId="tech-env-entries"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getEnvEntryRowId}
      toolbarActions={toolbarActions}
      emptyText="No entries yet. Add one — you can add multiple and pick a default."
      defaultSort={{ field: 'name', dir: 'asc' }}
      searchPlaceholder="Search name or description"
      refetchRef={refetchRef}
    />
  );
}
