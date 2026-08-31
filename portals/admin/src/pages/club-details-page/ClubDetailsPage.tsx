import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Box, Chip, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VerifiedIcon from '@mui/icons-material/Verified';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { BackButton, QueryGuard } from '@duncit/ui';
import { CLUB_DETAIL } from './queries';
import ClubOverviewCard from './ClubOverviewCard';
import ClubContentSections from './ClubContentSections';
import ClubPodsCard from './ClubPodsCard';
import ClubAdminsCard from './ClubAdminsCard';
import MediaGallery from './MediaGallery';
import type { ClubDetail, ClubPodRow } from './types';
import { useTranslation } from '@duncit/shell';

export default function ClubDetailsPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<any>(CLUB_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const club = data?.club as ClubDetail | undefined;
  const pods = (data?.pods ?? []) as ClubPodRow[];

  return (
    <QueryGuard
      loading={loading && !club}
      error={error}
      errorText={error?.message}
      notFound={!club}
      notFoundText="Club not found."
      notFoundSeverity="warning"
    >
      {() => club && (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: "space-between"
        }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            minWidth: 0
          }}>
          <BackButton onClick={() => navigate('/clubs')}>{t('admin.clubs.title')}</BackButton>
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                flexWrap: 'wrap'
              }}>
              <Typography variant="h5" noWrap sx={{
                fontWeight: 900
              }}>
                {club.club_name}
              </Typography>
              {club.is_verified && <VerifiedIcon color="primary" fontSize="small" titleAccess="Verified" />}
              <Chip
                size="small"
                label={club.is_active ? t('admin.profile.active') : t('admin.profile.inactive')}
                color={club.is_active ? 'success' : 'default'}
              />
            </Stack>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              /{club.club_id}
            </Typography>
          </Box>
        </Stack>
        <DuncitButton
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/clubs/${club.id}/edit`)}
        >
          Edit club
        </DuncitButton>
      </Stack>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, alignItems: 'start' }}>
        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          <ClubOverviewCard club={club} podCount={pods.length} />
          <MediaGallery
            title={t('admin.clubs.coverMedia')}
            icon={<PhotoLibraryIcon color="primary" />}
            items={club.club_feature_images_and_videos ?? []}
            emptyText={t('admin.clubs.noCoverMedia')}
          />
          <MediaGallery
            title={t('admin.clubs.moments')}
            icon={<AutoAwesomeIcon color="primary" />}
            items={club.club_moments ?? []}
            emptyText={t('admin.clubs.noMoments')}
          />
          <ClubContentSections club={club} />
        </Stack>

        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          <ClubPodsCard pods={pods} />
          <ClubAdminsCard admins={club.club_admins ?? []} />
        </Stack>
      </Box>
    </Stack>
      )}
    </QueryGuard>
  );
}
