import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { useTranslation } from '@duncit/shell';
import { MediaGallery } from '@duncit/entity-consoles';
import VenueAboutCard from './VenueAboutCard';
import VenueLocationCard from './VenueLocationCard';
import VenueOwnerCard from './VenueOwnerCard';
import VenueRecordCard from './VenueRecordCard';
import type { AdminVenueDetail } from './queries';

/** The whole venue record at a glance. Two columns on desktop: what the venue
 * is on the left, who and when on the right. */
export default function VenueOverviewTab({ venue }: Readonly<{ venue: AdminVenueDetail }>) {
  const { t } = useTranslation();
  // The gallery is a list of plain urls; the shared gallery takes media rows.
  const media = useMemo(() => (venue.gallery ?? []).map((url) => ({ url })), [venue.gallery]);

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2.5,
        gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
        alignItems: 'start',
      }}
    >
      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        <VenueAboutCard venue={venue} />
        <MediaGallery
          title={t('admin.venueDetails.gallery')}
          icon={<PhotoLibraryIcon color="primary" />}
          items={media}
          emptyText={t('admin.venueDetails.noGallery')}
        />
      </Stack>

      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        <VenueLocationCard venue={venue} />
        <VenueOwnerCard venue={venue} />
        <VenueRecordCard venue={venue} />
      </Stack>
    </Box>
  );
}
