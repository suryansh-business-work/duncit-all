import { Box, Stack, Typography } from '@mui/material';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';

export default function SlidersToolbar() {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ViewCarouselIcon color="primary" />
        <Typography variant="h5">Sliders</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Hub app banners. Target Global, a specific Location, or a Zone inside a Location.
      </Typography>
    </Box>
  );
}
