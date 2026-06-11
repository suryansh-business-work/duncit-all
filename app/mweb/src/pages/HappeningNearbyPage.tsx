import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import PodCard from './home-page/PodCard';
import { useHomeData } from './home-page/useHomeData';
import { podUrl } from '../utils/seoUrls';

interface Props {
  superCategorySlug: string;
  locationId: string;
  zoneName: string;
}

/** Dedicated page listing every live (upcoming) pod for the selected
 * city/super-category — reached from the Home "Happening nearby" section. */
export default function HappeningNearbyPage({
  superCategorySlug,
  locationId,
  zoneName,
}: Readonly<Props>) {
  const navigate = useNavigate();
  const { activePods, loading, error, hostNameOf } = useHomeData({
    superCategorySlug,
    locationId,
    zoneName,
    categoryId: '',
    priceFilter: 'ALL',
    dateFilter: 'ALL',
    sortBy: 'DATE_ASC',
  });

  let body: React.ReactNode;
  if (loading && activePods.length === 0) {
    body = (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  } else if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else if (activePods.length === 0) {
    body = <Alert severity="info">No live pods around you right now.</Alert>;
  } else {
    body = (
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          justifyContent: { xs: 'center', sm: 'flex-start' },
        }}
      >
        {activePods.map((pod: any) => (
          <PodCard
            key={pod.id}
            pod={pod}
            hostName={hostNameOf(pod)}
            onOpen={() => navigate(podUrl(pod.club_slug, pod.pod_id))}
          />
        ))}
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ p: { xs: 1.5, sm: 2 }, minHeight: '100%' }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <WhatshotIcon color="primary" />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
            Happening nearby
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Live pods around your selected city
          </Typography>
        </Box>
      </Stack>
      {body}
    </Stack>
  );
}
