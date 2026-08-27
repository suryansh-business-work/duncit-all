import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Avatar, Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import EventIcon from '@mui/icons-material/Event';
import { DuncitIconButton } from '@duncit/buttons';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
  type TableFilterValue,
} from '@duncit/table';
import type { ClubRow } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<ClubRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  catName: (id: string) => string;
  /** Toolbar's Super Category filter; '' means every super category. */
  superCategoryId: string;
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
    <Typography variant="body2" component="div" sx={{
      fontWeight: 600
    }}>
      {c.club_name}
    </Typography>
    <Typography variant="caption" component="div" sx={{
      color: "text.secondary"
    }}>
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

export default function ClubsTable({
  fetchRows,
  refetchRef,
  catName,
  superCategoryId,
  toolbarActions,
  onEdit,
  onRemove,
  onView,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<ClubRow>[]>(() => {
    const renderCategory = (c: ClubRow) =>
      c.category_id ? <Chip size="small" label={catName(c.category_id)} /> : '—';
    const renderViewPods = (c: ClubRow) => (
      <Tooltip title={t('admin.clubs.viewPods')}>
        <DuncitIconButton size="small" component={RouterLink} to={`/pods?club_id=${c.id}`}>
          <EventIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    );
    return [
      { field: 'cover', headerName: t('admin.clubs.colCover'), sortable: false, width: 80, cellRenderer: renderCover },
      {
        field: 'club_name',
        headerName: t('admin.clubs.colClub'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderClub,
        valueGetter: (c) => c.club_name,
      },
      {
        field: 'category_id',
        headerName: t('admin.clubs.colCategory'),
        minWidth: 140,
        cellRenderer: renderCategory,
        valueGetter: (c) => (c.category_id ? catName(c.category_id) : '—'),
      },
      {
        field: 'matched_venues_count',
        headerName: t('admin.clubs.venues'),
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
      { field: 'locality', headerName: t('admin.clubs.colLocality'), filter: { type: 'text' }, hide: true, minWidth: 140 },
      activeChipColumn<ClubRow>({ inactiveLabel: 'Draft' }),
      {
        field: 'is_verified',
        headerName: t('admin.clubs.verified'),
        filter: { type: 'boolean' },
        hide: true,
        width: 110,
        valueGetter: (c) => (c.is_verified ? 'Yes' : 'No'),
      },
      dateColumn<ClubRow>(),
      actionsColumn<ClubRow>({
        width: 140,
        onEdit,
        onDelete: onRemove,
        delete: { color: 'default' },
        renderExtra: renderViewPods,
      }),
    ];
  }, [catName, onEdit, onRemove]);

  // Pinned page filter rather than a column one: it belongs to the toolbar, so
  // it never shows as a removable chip and a change resets to page 1.
  const externalFilters = useMemo<TableFilterValue[]>(
    () =>
      superCategoryId ? [{ field: 'super_category_id', op: 'eq', value: superCategoryId }] : [],
    [superCategoryId],
  );

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
      externalFilters={externalFilters}
      refetchRef={refetchRef}
    />
  );
}
