import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import GroupsIcon from '@mui/icons-material/Groups';
import VerifiedIcon from '@mui/icons-material/Verified';
import { activeChipColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { ClubAdminClubInfoRow } from './queries';
import { useTranslation } from '@duncit/shell';

/** Thumbnail + name (+ verified badge) + slug caption — the primary club cell. */
const renderClub = (club: ClubAdminClubInfoRow) => (
  <Stack direction="row" spacing={1.25} sx={{
    alignItems: "center"
  }}>
    <Avatar
      variant="rounded"
      src={club.cover_image_url ?? undefined}
      alt={club.club_name}
      sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}
    >
      <GroupsIcon fontSize="small" color="disabled" />
    </Avatar>
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Stack direction="row" spacing={0.5} sx={{
        alignItems: "center"
      }}>
        <Typography variant="body2" noWrap component="div" sx={{
          fontWeight: 900
        }}>
          {club.club_name}
        </Typography>
        {club.is_verified && <VerifiedIcon color="primary" sx={{ fontSize: 16 }} />}
      </Stack>
      <Typography variant="caption" noWrap component="div" sx={{
        color: "text.secondary"
      }}>
        {club.slug}
      </Typography>
    </Box>
  </Stack>
);

/** "Pods" jump to the club's pod list (row click opens the club details). */
const renderActions = (club: ClubAdminClubInfoRow, t: Translate) => (
  <Stack direction="row" component="span" sx={{
    justifyContent: "flex-end"
  }}>
    <Button
      size="small"
      variant="outlined"
      component={RouterLink}
      to={`/club-admin/clubs/${club.id}`}
      startIcon={<EventNoteIcon />}
    >
      {t('shell.nav.pods')}
    </Button>
  </Stack>
);

type Translate = ReturnType<typeof useTranslation>['t'];

export const clubAdminClubsColumns = (t: Translate): DuncitColumn<ClubAdminClubInfoRow>[] =>[
  {
    field: 'club_name',
    headerName: t('partners.common.club'),
    flex: 1,
    minWidth: 230,
    filter: { type: 'text' },
    cellRenderer: renderClub,
    valueGetter: (club) => club.club_name,
  },
  {
    field: 'category',
    headerName: t('partners.common.category'),
    minWidth: 140,
    filter: { type: 'text' },
    valueGetter: (club) => club.category ?? EM_DASH,
  },
  {
    field: 'super_category',
    headerName: t('partners.clubAdminClubsPage.superCategory'),
    hide: true,
    minWidth: 150,
    filter: { type: 'text' },
    valueGetter: (club) => club.super_category ?? EM_DASH,
  },
  {
    field: 'locality',
    headerName: t('partners.common.locality'),
    minWidth: 130,
    filter: { type: 'text' },
    valueGetter: (club) => club.locality || EM_DASH,
  },
  {
    field: 'location_label',
    headerName: t('partners.common.city'),
    hide: true,
    minWidth: 120,
    valueGetter: (club) => club.location_label ?? EM_DASH,
  },
  {
    field: 'followers_count',
    headerName: t('partners.common.followers'),
    width: 115,
    filter: { type: 'number' },
    valueGetter: (club) => club.followers_count,
  },
  {
    field: 'total_pods',
    headerName: t('shell.nav.pods'),
    width: 95,
    filter: { type: 'number' },
    valueGetter: (club) => club.total_pods,
  },
  {
    field: 'upcoming_pods',
    headerName: t('partners.common.upcoming'),
    width: 115,
    filter: { type: 'number' },
    valueGetter: (club) => club.upcoming_pods,
  },
  {
    field: 'matched_venues_count',
    headerName: t('shell.nav.venues'),
    width: 105,
    filter: { type: 'number' },
    valueGetter: (club) => club.matched_venues_count,
  },
  activeChipColumn<ClubAdminClubInfoRow>({
    field: 'is_verified',
    headerName: t('partners.clubAdminClubsPage.verified'),
    width: 120,
    activeLabel: 'Verified',
    inactiveLabel: 'Unverified',
    outlineInactive: true,
  }),
  activeChipColumn<ClubAdminClubInfoRow>(),
  dateColumn<ClubAdminClubInfoRow>({ hide: false }),
  {
    field: 'actions',
    headerName: t('shell.common.actions'),
    sortable: false,
    width: 130,
    cellRenderer: (row: ClubAdminClubInfoRow) => renderActions(row, t),
  },
];
