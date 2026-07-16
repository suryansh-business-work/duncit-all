import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Avatar, Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import type { LocationRow } from './queries';

interface Props {
  fetchRows: TableFetch<LocationRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (loc: LocationRow) => void;
  onDelete: (loc: LocationRow) => void;
}

const VISIBLE_ZONE_CHIPS = 2;

const getLocationRowId = (loc: LocationRow) => loc.id;

const zoneLabel = (z: { zone_name: string; pincode?: string | null }) =>
  z.pincode ? `${z.zone_name} · ${z.pincode}` : z.zone_name;

const renderImage = (loc: LocationRow) => (
  <Avatar variant="rounded" src={loc.location_image ?? undefined} sx={{ width: 32, height: 32 }}>
    {(loc.city || loc.location_name || '?')[0]}
  </Avatar>
);

const renderCity = (loc: LocationRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={600} component="div">
      {loc.city || loc.location_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
      {loc.country}
    </Typography>
  </Box>
);

const renderZones = (loc: LocationRow) => {
  if (loc.location_zones.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" component="span">
        No areas
      </Typography>
    );
  }
  const visible = loc.location_zones.slice(0, VISIBLE_ZONE_CHIPS);
  const overflow = loc.location_zones.length - visible.length;
  return (
    <Stack direction="row" spacing={0.5} component="span" alignItems="center">
      {visible.map((z) => (
        <Chip key={`${loc.id}-${z.zone_name}-${z.pincode}`} size="small" label={zoneLabel(z)} />
      ))}
      {overflow > 0 && (
        <Tooltip title={loc.location_zones.slice(VISIBLE_ZONE_CHIPS).map(zoneLabel).join(', ')}>
          <Chip size="small" variant="outlined" label={`+${overflow} more`} />
        </Tooltip>
      )}
    </Stack>
  );
};

export default function LocationsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<LocationRow>[]>(() => {
    return [
      { field: 'image', headerName: 'Image', sortable: false, width: 76, cellRenderer: renderImage },
      {
        field: 'city',
        headerName: 'City',
        filter: { type: 'text' },
        flex: 1,
        minWidth: 160,
        cellRenderer: renderCity,
        valueGetter: (loc) => loc.city || loc.location_name,
      },
      {
        field: 'state',
        headerName: 'State',
        filter: { type: 'text' },
        minWidth: 130,
        valueGetter: (loc) => loc.state || '—',
      },
      {
        field: 'zones',
        headerName: 'Localities / Areas',
        sortable: false,
        flex: 1.4,
        minWidth: 260,
        cellRenderer: renderZones,
        valueGetter: (loc) => loc.location_zones.map(zoneLabel).join(', '),
      },
      {
        field: 'country',
        headerName: 'Country',
        filter: { type: 'text' },
        hide: true,
        minWidth: 130,
        valueGetter: (loc) => loc.country ?? '—',
      },
      activeChipColumn<LocationRow>(),
      dateColumn<LocationRow>(),
      actionsColumn<LocationRow>({ onEdit, onDelete, delete: { color: 'default' } }),
    ];
  }, [onEdit, onDelete]);

  return (
    <DuncitTable<LocationRow>
      tableId="admin-locations"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getLocationRowId}
      toolbarActions={toolbarActions}
      emptyText={'No locations yet. Click "New Location" to create one.'}
      defaultSort={{ field: 'city', dir: 'asc' }}
      searchPlaceholder="Search state, city, area or PIN"
      refetchRef={refetchRef}
    />
  );
}
