import { useMemo, type MutableRefObject } from 'react';
import { Box, Chip, Link, Stack, Switch, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { PortalModeRow, PortalModeState } from './queries';
import { useTranslation } from '@duncit/app-settings';

const KIND_LABEL: Record<string, string> = { PORTAL: 'Portal', WEBSITE: 'Website', APP: 'App' };

type Translate = ReturnType<typeof useTranslation>['t'];

const kindOptions = (t: Translate) => [
  { value: 'PORTAL', label: t('tech.common.portal') },
  { value: 'WEBSITE', label: t('tech.common.website') },
  { value: 'APP', label: t('tech.common.app') },
] as const;

const modeOptions = (t: Translate) => [
  { value: 'LIVE', label: t('tech.portalModes.live') },
  { value: 'MAINTENANCE', label: t('shell.nav.maintenance') },
  { value: 'DEVELOPMENT', label: t('tech.portalModes.development') },
] as const;

type StatusMeta = { color: 'warning' | 'info' | 'success'; label: string };

const statusMeta = (mode: PortalModeState, t: Translate): StatusMeta => {
  if (mode === 'MAINTENANCE') return { color: 'warning', label: t('shell.nav.maintenance') };
  if (mode === 'DEVELOPMENT') return { color: 'info', label: t('tech.portalModes.development') };
  return { color: 'success', label: t('tech.portalModes.live') };
};

const getPortalModeRowId = (row: PortalModeRow) => row.key;

const renderName = (row: PortalModeRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="div" sx={{
      fontWeight: 700
    }}>{row.name}</Typography>
    <Stack direction="row" spacing={0.5} component="span" sx={{
      alignItems: "center"
    }}>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>{row.key}</Typography>
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
    <Typography variant="caption" sx={{
      color: "text.secondary"
    }}>—</Typography>
  );
const linkValue = (row: PortalModeRow) => row.url ?? '';

const renderStatus = (row: PortalModeRow, t: Translate) => {
  const status = statusMeta(row.mode, t);
  return <Chip size="small" color={status.color} label={status.label} />;
};
const statusValue = (row: PortalModeRow, t: Translate) => statusMeta(row.mode, t).label;

const maintenanceValue = (row: PortalModeRow) => (row.mode === 'MAINTENANCE' ? 'On' : 'Off');
const developmentValue = (row: PortalModeRow) => (row.mode === 'DEVELOPMENT' ? 'On' : 'Off');

interface Props {
  fetchRows: TableFetch<PortalModeRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  busyKey?: string | null;
  onChange: (row: PortalModeRow, mode: PortalModeState) => void;
}

export default function PortalModesTable({ fetchRows, refetchRef, busyKey, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
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
      { field: 'name', headerName: t('tech.portalModes.portalName'), flex: 1, minWidth: 220, cellRenderer: renderName, valueGetter: nameValue },
      { field: 'kind', headerName: t('shell.common.type'), hide: true, width: 120, filter: { type: 'select', options: kindOptions(t) } },
      { field: 'url', headerName: t('tech.portalModes.link'), sortable: false, flex: 1, minWidth: 200, cellRenderer: renderLink, valueGetter: linkValue },
      {
        field: 'maintenance',
        headerName: t('shell.nav.maintenance'),
        sortable: false,
        width: 130,
        cellRenderer: renderMaintenance,
        valueGetter: maintenanceValue,
      },
      {
        field: 'development',
        headerName: t('tech.portalModes.development'),
        sortable: false,
        width: 130,
        cellRenderer: renderDevelopment,
        valueGetter: developmentValue,
      },
      {
        field: 'mode',
        headerName: t('shell.common.status'),
        width: 150,
        filter: { type: 'select', options: modeOptions(t) },
        cellRenderer: (row: PortalModeRow) => renderStatus(row, t),
        valueGetter: (row: PortalModeRow) => statusValue(row, t),
      },
    ];
  }, [busyKey, onChange]);

  return (
    <DuncitTable<PortalModeRow>
      tableId="tech-portal-modes"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPortalModeRowId}
      emptyText={t('tech.portalModes.noPortalsRegistered')}
      searchPlaceholder="Search by name or key"
      refetchRef={refetchRef}
    />
  );
}
