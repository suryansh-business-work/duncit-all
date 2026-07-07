import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import VerifiedIcon from '@mui/icons-material/Verified';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { CLUB_DETAIL } from './queries';
import ClubOverviewCard from './ClubOverviewCard';
import ClubContentSections from './ClubContentSections';
import ClubPodsCard from './ClubPodsCard';
import ClubAdminsCard from './ClubAdminsCard';
import MediaGallery from './MediaGallery';
import type { ClubDetail, ClubPodRow } from './types';

export default function ClubDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(CLUB_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const club = data?.club as ClubDetail | undefined;
  const pods = (data?.pods ?? []) as ClubPodRow[];

  if (loading && !club)
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!club) return <Alert severity="warning">Club not found.</Alert>;

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/clubs')} size="small">
            Clubs
          </Button>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Typography variant="h5" fontWeight={900} noWrap>
                {club.club_name}
              </Typography>
              {club.is_verified && <VerifiedIcon color="primary" fontSize="small" titleAccess="Verified" />}
              <Chip
                size="small"
                label={club.is_active ? 'Active' : 'Inactive'}
                color={club.is_active ? 'success' : 'default'}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              /{club.club_id}
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/clubs?edit=${club.id}`)}
        >
          Edit club
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, alignItems: 'start' }}>
        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          <ClubOverviewCard club={club} podCount={pods.length} />
          <MediaGallery
            title="Cover media"
            icon={<PhotoLibraryIcon color="primary" />}
            items={club.club_feature_images_and_videos ?? []}
            emptyText="No cover images or videos added yet."
          />
          <MediaGallery
            title="Moments"
            icon={<AutoAwesomeIcon color="primary" />}
            items={club.club_moments ?? []}
            emptyText="No moments captured for this club yet."
          />
          <ClubContentSections club={club} />
        </Stack>

        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          <ClubPodsCard pods={pods} />
          <ClubAdminsCard admins={club.club_admins ?? []} />
        </Stack>
      </Box>
    </Stack>
  );
}
