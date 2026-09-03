import { Link as RouterLink } from 'react-router';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import EventNoteIcon from '@mui/icons-material/EventNote';
import GroupsIcon from '@mui/icons-material/Groups';
import VerifiedIcon from '@mui/icons-material/Verified';
import { DuncitButton } from '@duncit/buttons';
import { formatCount } from '@duncit/utils';
import FactLine from '../../components/club-admin/FactLine';
import type { AdminClubRow } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * One club the admin runs: cover, name (with the verified mark), category and
 * locality, its three figures, and the two doors — its pods and its page.
 */
export default function AdminClubRowCard({ club }: Readonly<{ club: AdminClubRow }>) {
  const { t } = useTranslation();
  const where = [club.category, club.locality].filter(Boolean).join(' · ');
  const clubPath = `/clubs/${club.id}`;

  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: '16px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1.25}>
        <Avatar
          variant="rounded"
          src={club.cover_image_url ?? undefined}
          alt={club.club_name}
          sx={{ width: 56, height: 56, borderRadius: '12px', bgcolor: 'action.hover' }}
        >
          <GroupsIcon color="disabled" />
        </Avatar>
        <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
              {club.club_name}
            </Typography>
            {club.is_verified && (
              <VerifiedIcon
                color="primary"
                sx={{ fontSize: 16 }}
                titleAccess={t('clubAdmin.clubs.verified')}
              />
            )}
          </Stack>
          {where && (
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
              {where}
            </Typography>
          )}
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
            <FactLine value={formatCount(club.followers_count)} label={t('clubAdmin.clubs.followers')} />
            <FactLine value={formatCount(club.total_pods)} label={t('clubAdmin.clubs.pods')} />
            <FactLine value={formatCount(club.upcoming_pods)} label={t('clubAdmin.clubs.upcoming')} />
          </Stack>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
        <DuncitButton
          component={RouterLink}
          to={`${clubPath}/pods`}
          variant="contained"
          size="small"
          startIcon={<EventNoteIcon />}
          sx={{ flex: 1, borderRadius: 999, fontWeight: 700 }}
        >
          {t('mweb.clubStudio.openPods')}
        </DuncitButton>
        <DuncitButton
          component={RouterLink}
          to={`${clubPath}/edit`}
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          sx={{ flex: 1, borderRadius: 999, fontWeight: 700 }}
        >
          {t('mweb.clubStudio.editClub')}
        </DuncitButton>
      </Stack>
    </Box>
  );
}
