import { useMemo, type MutableRefObject } from 'react';
import { Box, Chip, Link, Stack, Switch, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { PortalModeRow, PortalModeState } from './queries';

const KIND_LABEL: Record<string, string> = { PORTAL: 'Portal', WEBSITE: 'Website', APP: 'App' };

const KIND_OPTIONS = [
  { value: 'PORTAL', label: 'Portal' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'APP', label: 'App' },
] as const;

const MODE_OPTIONS = [
  { value: 'LIVE', label: 'Live' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'DEVELOPMENT', label: 'Development' },
] as const;

type StatusMeta = { color: 'warning' | 'info' | 'success'; label: string };

const statusMeta = (mode: PortalModeState): StatusMeta => {
  if (mode === 'MAINTENANCE') return { color: 'warning', label: 'Maintenance' };
  if (mode === 'DEVELOPMENT') return { color: 'info', label: 'Development' };
  return { color: 'success', label: 'Live' };
};

const getPortalModeRowId = (row: PortalModeRow) => row.key;

const renderName = (row: PortalModeRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="div">{row.name}</Typography>
    <Stack direction="row" spacing={0.5} alignItems="center" component="span">
      <Typography variant="caption" color="text.secondary">{row.key}</Typography>
      <Chip size="small" variant="outlined" label={KIND_LABEL[row.kind] ?? row.kind} />
    </Stack>
  </Box>
);
const nameValue = (row: PortalModeRow) => row.name;

const renderLink = (row: PortalModeRow) =>
  row.url ? (
    <Link
      href={row.url}
      target="_blank"
      rel="noopener noreferrer"
      variant="body2"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
    >
      {row.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      <OpenInNewIcon sx={{ fontSize: 14 }} />
    </Link>
  ) : (
    <Typography variant="caption" color="text.secondary">—</Typography>
  );
const linkValue = (row: PortalModeRow) => row.url ?? '';

const renderStatus = (row: PortalModeRow) => {
  const status = statusMeta(row.mode);
  return <Chip size="small" color={status.color} label={status.label} />;
};
const statusValue = (row: PortalModeRow) => statusMeta(row.mode).label;

const maintenanceValue = (row: PortalModeRow) => (row.mode === 'MAINTENANCE' ? 'On' : 'Off');
const developmentValue = (row: PortalModeRow) => (row.mode === 'DEVELOPMENT' ? 'On' : 'Off');

interface Props {
  fetchRows: TableFetch<PortalModeRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  busyKey?: string | null;
  onChange: (row: PortalModeRow, mode: PortalModeState) => void;
}

export default function PortalModesTable({ fetchRows, refetchRef, busyKey, onChange }: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<PortalModeRow>[]>(() => {
    const renderMaintenance = (row: PortalModeRow) => (
      <Switch
        color="warning"
        checked={row.mode === 'MAINTENANCE'}
        disabled={busyKey === row.key}
        onChange={(e) => onChange(row, e.target.checked ? 'MAINTENANCE' : 'LIVE')}
      />
    );
    const renderDevelopment = (row: PortalModeRow) => (
      <Switch
        color="info"
        checked={row.mode === 'DEVELOPMENT'}
        disabled={busyKey === row.key}
        onChange={(e) => onChange(row, e.target.checked ? 'DEVELOPMENT' : 'LIVE')}
      />
    );
    return [
      { field: 'name', headerName: 'Portal name', flex: 1, minWidth: 220, cellRenderer: renderName, valueGetter: nameValue },
      { field: 'kind', headerName: 'Type', hide: true, width: 120, filter: { type: 'select', options: KIND_OPTIONS } },
      { field: 'url', headerName: 'Link', sortable: false, flex: 1, minWidth: 200, cellRenderer: renderLink, valueGetter: linkValue },
      {
        field: 'maintenance',
        headerName: 'Maintenance',
        sortable: false,
        width: 130,
        cellRenderer: renderMaintenance,
        valueGetter: maintenanceValue,
      },
      {
        field: 'development',
        headerName: 'Development',
        sortable: false,
        width: 130,
        cellRenderer: renderDevelopment,
        valueGetter: developmentValue,
      },
      {
        field: 'mode',
        headerName: 'Status',
        width: 150,
        filter: { type: 'select', options: MODE_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: statusValue,
      },
    ];
  }, [busyKey, onChange]);

  return (
    <DuncitTable<PortalModeRow>
      tableId="tech-portal-modes"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPortalModeRowId}
      emptyText="No portals registered."
      searchPlaceholder="Search by name or key"
      refetchRef={refetchRef}
    />
  );
}
