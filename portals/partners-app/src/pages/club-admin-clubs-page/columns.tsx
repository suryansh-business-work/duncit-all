import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import GroupsIcon from '@mui/icons-material/Groups';
import VerifiedIcon from '@mui/icons-material/Verified';
import { activeChipColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { ClubAdminClubInfoRow } from './queries';

/** Thumbnail + name (+ verified badge) + slug caption — the primary club cell. */
const renderClub = (club: ClubAdminClubInfoRow) => (
  <Stack direction="row" spacing={1.25} alignItems="center">
    <Avatar
      variant="rounded"
      src={club.cover_image_url ?? undefined}
      alt={club.club_name}
      sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}
    >
      <GroupsIcon fontSize="small" color="disabled" />
    </Avatar>
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography variant="body2" fontWeight={900} noWrap component="div">
          {club.club_name}
        </Typography>
        {club.is_verified && <VerifiedIcon color="primary" sx={{ fontSize: 16 }} />}
      </Stack>
      <Typography variant="caption" color="text.secondary" noWrap component="div">
        {club.slug}
      </Typography>
    </Box>
  </Stack>
);

/** "Pods" jump to the club's pod list (row click opens the club details). */
const renderActions = (club: ClubAdminClubInfoRow) => (
  <Stack direction="row" justifyContent="flex-end" component="span">
    <Button
      size="small"
      variant="outlined"
      component={RouterLink}
      to={`/club-admin/clubs/${club.id}`}
      startIcon={<EventNoteIcon />}
    >
      Pods
    </Button>
  </Stack>
);

export const CLUB_ADMIN_CLUBS_COLUMNS: DuncitColumn<ClubAdminClubInfoRow>[] = [
  {
    field: 'club_name',
    headerName: 'Club',
    flex: 1,
    minWidth: 230,
    filter: { type: 'text' },
    cellRenderer: renderClub,
    valueGetter: (club) => club.club_name,
  },
  {
    field: 'category',
    headerName: 'Category',
    minWidth: 140,
    filter: { type: 'text' },
    valueGetter: (club) => club.category ?? EM_DASH,
  },
  {
    field: 'super_category',
    headerName: 'Super category',
    hide: true,
    minWidth: 150,
    filter: { type: 'text' },
    valueGetter: (club) => club.super_category ?? EM_DASH,
  },
  {
    field: 'locality',
    headerName: 'Locality',
    minWidth: 130,
    filter: { type: 'text' },
    valueGetter: (club) => club.locality || EM_DASH,
  },
  {
    field: 'location_label',
    headerName: 'City',
    hide: true,
    minWidth: 120,
    valueGetter: (club) => club.location_label ?? EM_DASH,
  },
  {
    field: 'followers_count',
    headerName: 'Followers',
    width: 115,
    filter: { type: 'number' },
    valueGetter: (club) => club.followers_count,
  },
  {
    field: 'total_pods',
    headerName: 'Pods',
    width: 95,
    filter: { type: 'number' },
    valueGetter: (club) => club.total_pods,
  },
  {
    field: 'upcoming_pods',
    headerName: 'Upcoming',
    width: 115,
    filter: { type: 'number' },
    valueGetter: (club) => club.upcoming_pods,
  },
  {
    field: 'matched_venues_count',
    headerName: 'Venues',
    width: 105,
    filter: { type: 'number' },
    valueGetter: (club) => club.matched_venues_count,
  },
  activeChipColumn<ClubAdminClubInfoRow>({
    field: 'is_verified',
    headerName: 'Verified',
    width: 120,
    activeLabel: 'Verified',
    inactiveLabel: 'Unverified',
    outlineInactive: true,
  }),
  activeChipColumn<ClubAdminClubInfoRow>(),
  dateColumn<ClubAdminClubInfoRow>({ hide: false }),
  {
    field: 'actions',
    headerName: 'Actions',
    sortable: false,
    width: 130,
    cellRenderer: renderActions,
  },
];
