import { useMemo, type MutableRefObject } from 'react';
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { EnvEntry } from '../queries';
import type { PortalListItem } from '../portal-env-queries';

const KIND_LABEL: Record<string, string> = { PORTAL: 'Portal', WEBSITE: 'Website', APP: 'App' };

const KIND_OPTIONS = [
  { value: 'PORTAL', label: 'Portal' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'APP', label: 'App' },
] as const;

export interface PortalRow {
  portal: PortalListItem;
  entries: EnvEntry[];
}

const getPortalRowId = (row: PortalRow) => row.portal.key;

const renderPortal = (row: PortalRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="div">{row.portal.name}</Typography>
    <Typography variant="caption" color="text.secondary" component="div">{row.portal.key}</Typography>
  </Box>
);
const portalValue = (row: PortalRow) => row.portal.name;

const kindLabel = (row: PortalRow) => KIND_LABEL[row.portal.kind] ?? row.portal.kind;
const renderKind = (row: PortalRow) => <Chip size="small" variant="outlined" label={kindLabel(row)} />;

const renderConfigs = (row: PortalRow) => (
  <Chip
    size="small"
    color={row.entries.length ? 'primary' : 'default'}
    variant={row.entries.length ? 'filled' : 'outlined'}
    label={row.entries.length}
  />
);
const configsValue = (row: PortalRow) => row.entries.length;

interface Props {
  fetchRows: TableFetch<PortalRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onInfo: (row: PortalRow) => void;
  onAssign: (portal: PortalListItem) => void;
}

/** Tabular view of every portal and how many env entries it has assigned. */
export default function PortalMappingTable({ fetchRows, refetchRef, onInfo, onAssign }: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<PortalRow>[]>(() => {
    const renderActions = (row: PortalRow) => (
      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center" component="span">
        <Tooltip title="Show assigned configs">
          <span>
            <IconButton size="small" onClick={() => onInfo(row)} disabled={!row.entries.length}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Button size="small" startIcon={<TuneIcon />} onClick={() => onAssign(row.portal)}>
          Assign
        </Button>
      </Stack>
    );
    return [
      { field: 'name', headerName: 'Portal', flex: 1, minWidth: 200, cellRenderer: renderPortal, valueGetter: portalValue },
      {
        field: 'kind',
        headerName: 'Type',
        width: 130,
        filter: { type: 'select', options: KIND_OPTIONS },
        cellRenderer: renderKind,
        valueGetter: kindLabel,
      },
      {
        field: 'configs',
        headerName: 'Assigned configs',
        sortable: false,
        width: 150,
        cellRenderer: renderConfigs,
        valueGetter: configsValue,
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 170, cellRenderer: renderActions },
    ];
  }, [onAssign, onInfo]);

  return (
    <DuncitTable<PortalRow>
      tableId="tech-portal-mapping"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPortalRowId}
      emptyText="No portals match your search."
      searchPlaceholder="Search portals by name or key…"
      refetchRef={refetchRef}
    />
  );
}
