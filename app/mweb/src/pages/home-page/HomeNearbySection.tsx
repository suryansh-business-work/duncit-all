import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router';
import { Box, Stack } from '@mui/material';
import HomeFeaturedPods from './HomeFeaturedPods';
import HomeNearbyHeader from './HomeNearbyHeader';

/** The "Happening nearby" title and its rail. With no pod nearby the whole
 * section goes, title included — a heading over nothing reads as a broken
 * page. The tour skips its "home-pods" stop while it is absent. Native twin:
 * HappeningNearbySection. */
export default function HomeNearbySection(
  props: Readonly<ComponentProps<typeof HomeFeaturedPods>>,
) {
  const navigate = useNavigate();
  if (props.pods.length === 0) return null;
  return (
    <Stack spacing={1.5}>
      <HomeNearbyHeader onOpen={() => navigate('/happening-nearby')} />
      <Box data-tour="home-pods">
        <HomeFeaturedPods {...props} />
      </Box>
    </Stack>
  );
}
