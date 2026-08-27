import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ScienceIcon from '@mui/icons-material/Science';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveIcon from '@mui/icons-material/Remove';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { EnvEntry } from './queries';
import { formatDateTime, useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

function LastTested({ entry }: Readonly<{ entry: EnvEntry }>) {
  const { t } = useTranslation();
  if (entry.last_test_ok == null || !entry.last_tested_at) {
    return <Tooltip title={t('tech.environment.notTestedYet')}><RemoveIcon fontSize="small" color="disabled" /></Tooltip>;
  }
  const when = formatDateTime(entry.last_tested_at);
  return entry.last_test_ok ? (
    <Tooltip title={`Passed · ${when}`}><CheckCircleIcon fontSize="small" color="success" /></Tooltip>
  ) : (
    <Tooltip title={`Failed · ${when}`}><CancelIcon fontSize="small" color="error" /></Tooltip>
  );
}

const getEnvEntryRowId = (e: EnvEntry) => e.id;

const renderName = (e: EnvEntry) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="div" sx={{
      fontWeight: 700
    }}>{e.name}</Typography>
    <Typography variant="caption" component="div" sx={{
      color: "text.secondary"
    }}>{e.description}</Typography>
  </Box>
);
const nameValue = (e: EnvEntry) => e.name;

const renderStatus = (e: EnvEntry, t: Translate) => (
  <Stack direction="row" spacing={0.5} component="span">
    {e.is_default && <Chip size="small" color="primary" label={t('tech.environment.default')} />}
    <Chip size="small" variant="outlined" color={e.is_active ? 'success' : 'default'} label={e.is_active ? t('tech.environment.active') : t('tech.environment.off')} />
  </Stack>
);
const statusValue = (e: EnvEntry) =>
  [e.is_default ? 'Default' : '', e.is_active ? 'Active' : 'Off'].filter(Boolean).join(' ');

const renderLastTested = (e: EnvEntry) => <LastTested entry={e} />;
const lastTestedValue = (e: EnvEntry) => {
  if (e.last_test_ok == null || !e.last_tested_at) return 'Never';
  const when = formatDateTime(e.last_tested_at);
  return e.last_test_ok ? `Passed · ${when}` : `Failed · ${when}`;
};

const renderPortals = (e: EnvEntry) =>
  e.assigned_portals.length
    ? <Typography variant="caption">{e.assigned_portals.join(', ')}</Typography>
    : <Typography variant="caption" sx={{
    color: "text.secondary"
  }}>—</Typography>;
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
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<EnvEntry>[]>(() => {
    const renderActions = (e: EnvEntry) => (
      <Stack direction="row" component="span" sx={{
        justifyContent: "flex-end"
      }}>
        <Tooltip title={t('tech.environment.testConnection')}><DuncitIconButton size="small" onClick={() => onTest(e)}><ScienceIcon fontSize="small" /></DuncitIconButton></Tooltip>
        <Tooltip title={t('shell.common.edit')}><DuncitIconButton size="small" onClick={() => onEdit(e)}><EditIcon fontSize="small" /></DuncitIconButton></Tooltip>
        <Tooltip title={t('tech.environment.setDefault')}><DuncitIconButton size="small" onClick={() => onSetDefault(e)}>{e.is_default ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}</DuncitIconButton></Tooltip>
        <Tooltip title={t('shell.common.delete')}><DuncitIconButton size="small" onClick={() => onDelete(e)}><DeleteIcon fontSize="small" /></DuncitIconButton></Tooltip>
      </Stack>
    );
    return [
      { field: 'name', headerName: t('shell.common.name'), flex: 1, minWidth: 200, cellRenderer: renderName, valueGetter: nameValue },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        width: 150,
        filter: { type: 'boolean' },
        cellRenderer: (e: EnvEntry) => renderStatus(e, t),
        valueGetter: statusValue,
      },
      { field: 'is_default', headerName: t('tech.environment.default'), hide: true, width: 100, filter: { type: 'boolean' } },
      {
        field: 'last_tested_at',
        headerName: t('tech.environment.lastTested'),
        width: 120,
        cellRenderer: renderLastTested,
        valueGetter: lastTestedValue,
      },
      { field: 'last_test_ok', headerName: t('tech.environment.testResult'), hide: true, width: 110, filter: { type: 'boolean' } },
      {
        field: 'assigned_portals',
        headerName: t('tech.environment.assignedPortals'),
        sortable: false,
        filter: { type: 'text' },
        flex: 1,
        minWidth: 160,
        cellRenderer: renderPortals,
        valueGetter: portalsValue,
      },
      { field: 'created_at', headerName: t('shell.common.created'), hide: true, width: 130, filter: { type: 'date' } },
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 170, cellRenderer: renderActions },
    ];
  }, [onDelete, onEdit, onSetDefault, onTest]);

  return (
    <DuncitTable<EnvEntry>
      tableId="tech-env-entries"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getEnvEntryRowId}
      toolbarActions={toolbarActions}
      emptyText={t('tech.environment.noEntriesYetAddOneYou')}
      defaultSort={{ field: 'name', dir: 'asc' }}
      searchPlaceholder="Search name or description"
      refetchRef={refetchRef}
    />
  );
}
