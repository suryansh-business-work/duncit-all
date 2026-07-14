import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Avatar, Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { SCOPES } from './queries';
import type { SliderRow } from './table.queries';

interface Props {
  fetchRows: TableFetch<SliderRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  locations: any[];
  toolbarActions?: ReactNode;
  onEdit: (s: SliderRow) => void;
  onRemove: (s: SliderRow) => void;
}

const SCOPE_OPTIONS = SCOPES.map((s) => ({ value: s.value, label: s.label }));

const getSliderRowId = (s: SliderRow) => s.id;

const renderPreview = (s: SliderRow) => (
  <Avatar
    variant="rounded"
    src={s.media_type === 'IMAGE' ? s.media_url : undefined}
    sx={{ width: 48, height: 30 }}
  >
    {s.title[0]}
  </Avatar>
);

const renderTitle = (s: SliderRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={600} component="div">
      {s.title}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
      {s.slider_id}
    </Typography>
  </Box>
);

const dateOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : null);

const windowValue = (s: SliderRow) => `${dateOnly(s.starts_at) ?? '—'} → ${dateOnly(s.ends_at) ?? '∞'}`;

const renderStatus = (s: SliderRow) => (
  <Chip
    size="small"
    label={s.is_active ? 'Active' : 'Inactive'}
    color={s.is_active ? 'success' : 'default'}
  />
);

function scopeColor(scope: SliderRow['scope']): 'primary' | 'info' | 'secondary' {
  if (scope === 'GLOBAL') return 'primary';
  if (scope === 'LOCATION') return 'info';
  return 'secondary';
}

export default function SlidersTable({
  fetchRows,
  refetchRef,
  locations,
  toolbarActions,
  onEdit,
  onRemove,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<SliderRow>[]>(() => {
    const locName = (id?: string | null) =>
      locations.find((l: any) => l.id === id)?.location_name ?? '—';
    const scopeLabel = (s: SliderRow) => {
      const meta = SCOPES.find((x) => x.value === s.scope);
      if (s.scope === 'LOCATION') return `${meta?.label} · ${locName(s.location_id)}`;
      if (s.scope === 'ZONE') return `${meta?.label} · ${locName(s.location_id)} / ${s.zone_name}`;
      return meta?.label ?? s.scope;
    };
    const renderScope = (s: SliderRow) => (
      <Chip
        size="small"
        icon={SCOPES.find((x) => x.value === s.scope)?.icon}
        label={scopeLabel(s)}
        color={scopeColor(s.scope)}
        variant="outlined"
      />
    );
    const renderActions = (s: SliderRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(s)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => onRemove(s)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'preview', headerName: 'Preview', sortable: false, width: 80, cellRenderer: renderPreview },
      {
        field: 'title',
        headerName: 'Title',
        flex: 1,
        minWidth: 180,
        cellRenderer: renderTitle,
        valueGetter: (s) => s.title,
      },
      {
        field: 'scope',
        headerName: 'Scope',
        filter: { type: 'select', options: SCOPE_OPTIONS },
        minWidth: 180,
        cellRenderer: renderScope,
        valueGetter: scopeLabel,
      },
      {
        field: 'link_url',
        headerName: 'Link',
        sortable: false,
        minWidth: 160,
        valueGetter: (s) => s.link_url || '—',
      },
      { field: 'sort_order', headerName: 'Order', filter: { type: 'number' }, width: 90 },
      {
        field: 'starts_at',
        headerName: 'Window',
        filter: { type: 'date' },
        width: 180,
        valueGetter: windowValue,
      },
      {
        field: 'ends_at',
        headerName: 'Ends',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (s) => dateOnly(s.ends_at) ?? '∞',
      },
      {
        field: 'is_active',
        headerName: 'Status',
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderStatus,
        valueGetter: (s) => (s.is_active ? 'Active' : 'Inactive'),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (s) => dateOnly(s.created_at) ?? '—',
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [locations, onEdit, onRemove]);

  return (
    <DuncitTable<SliderRow>
      tableId="admin-sliders"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getSliderRowId}
      toolbarActions={toolbarActions}
      emptyText="No sliders yet."
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder="Search title or slider ID"
      refetchRef={refetchRef}
    />
  );
}
