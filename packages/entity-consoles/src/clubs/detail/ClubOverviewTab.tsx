import { Box, Stack } from '@mui/material';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from '@duncit/shell';
import MediaGallery from '../../shared/MediaGallery';
import ClubOverviewCard from './ClubOverviewCard';
import ClubContentSections from './ClubContentSections';
import ClubAdminsCard from './ClubAdminsCard';
import { useClubAdminPath } from './useClubAdminPath';
import type { ClubDetail } from './types';

/**
 * The club itself: its story and reach, its media and page content, and the
 * people who run it — each admin's name a way into their full record.
 *
 * The pods list that used to sit beside the admins is the Pods tab now, as a
 * table that opens and edits each pod.
 */
export default function ClubOverviewTab({
  club,
  podCount,
}: Readonly<{ club: ClubDetail; podCount: number }>) {
  const { t } = useTranslation();
  const admins = club.club_admins ?? [];
  const adminPath = useClubAdminPath(club.id, admins);

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2.5,
        gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
        alignItems: 'start',
      }}
    >
      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        <ClubOverviewCard club={club} podCount={podCount} />
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
        <ClubAdminsCard admins={admins} adminPath={adminPath} />
      </Stack>
    </Box>
  );
}
