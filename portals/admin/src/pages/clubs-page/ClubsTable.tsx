import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Avatar, Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import { format } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { ClubRow } from './queries';

interface Props {
  fetchRows: TableFetch<ClubRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  catName: (id: string) => string;
  toolbarActions?: ReactNode;
  onEdit: (c: ClubRow) => void;
  onRemove: (c: ClubRow) => void;
  onView: (c: ClubRow) => void;
}

const getClubRowId = (c: ClubRow) => c.id;

const renderCover = (c: ClubRow) => (
  <Avatar
    variant="rounded"
    src={c.club_feature_images_and_videos?.[0]?.url}
    sx={{ width: 32, height: 32 }}
  >
    {c.club_name[0]}
  </Avatar>
);

const renderClub = (c: ClubRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={600} component="div">
      {c.club_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
      {c.club_id}
    </Typography>
  </Box>
);

const renderWhatsApp = (c: ClubRow) => (
  <Stack direction="row" spacing={0.5} component="span">
    {c.club_whats_app_community_link && <Chip size="small" label="C" />}
    {c.club_whats_app_group_link && <Chip size="small" label="G" />}
  </Stack>
);

const whatsAppValue = (c: ClubRow) =>
  [c.club_whats_app_community_link ? 'C' : '', c.club_whats_app_group_link ? 'G' : '']
    .filter(Boolean)
    .join(' ');

const renderStatus = (c: ClubRow) => (
  <Chip
    size="small"
    label={c.is_active ? 'Active' : 'Draft'}
    color={c.is_active ? 'success' : 'default'}
  />
);

const createdValue = (c: ClubRow) =>
  c.created_at ? format(new Date(c.created_at), 'd MMM yyyy') : '—';

export default function ClubsTable({
  fetchRows,
  refetchRef,
  catName,
  toolbarActions,
  onEdit,
  onRemove,
  onView,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<ClubRow>[]>(() => {
    const renderCategory = (c: ClubRow) =>
      c.category_id ? <Chip size="small" label={catName(c.category_id)} /> : '—';
    const renderActions = (c: ClubRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title="View Pods">
          <IconButton size="small" component={RouterLink} to={`/pods?club_id=${c.id}`}>
            <EventIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(c)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => onRemove(c)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'cover', headerName: 'Cover', sortable: false, width: 80, cellRenderer: renderCover },
      {
        field: 'club_name',
        headerName: 'Club',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderClub,
        valueGetter: (c) => c.club_name,
      },
      {
        field: 'category_id',
        headerName: 'Category',
        sortable: false,
        minWidth: 140,
        cellRenderer: renderCategory,
        valueGetter: (c) => (c.category_id ? catName(c.category_id) : '—'),
      },
      {
        field: 'matched_venues_count',
        headerName: 'Venues',
        sortable: false,
        width: 96,
        valueGetter: (c) => c.matched_venues_count ?? 0,
      },
      {
        field: 'whatsapp',
        headerName: 'WhatsApp',
        sortable: false,
        width: 110,
        cellRenderer: renderWhatsApp,
        valueGetter: whatsAppValue,
      },
      { field: 'locality', headerName: 'Locality', filter: { type: 'text' }, hide: true, minWidth: 140 },
      {
        field: 'is_active',
        headerName: 'Status',
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderStatus,
        valueGetter: (c) => (c.is_active ? 'Active' : 'Draft'),
      },
      {
        field: 'is_verified',
        headerName: 'Verified',
        filter: { type: 'boolean' },
        hide: true,
        width: 110,
        valueGetter: (c) => (c.is_verified ? 'Yes' : 'No'),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: createdValue,
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 140, cellRenderer: renderActions },
    ];
  }, [catName, onEdit, onRemove]);

  return (
    <DuncitTable<ClubRow>
      tableId="admin-clubs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getClubRowId}
      onRowClick={onView}
      toolbarActions={toolbarActions}
      emptyText={'No clubs yet. Click "New Club" to create the first one.'}
      defaultSort={{ field: 'club_name', dir: 'asc' }}
      searchPlaceholder="Search name, ID or locality"
      refetchRef={refetchRef}
    />
  );
}
