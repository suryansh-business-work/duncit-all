import { Box, CircularProgress } from '@mui/material';

/** What a route shows while its page chunk, or a gate in front of it, is still loading. */
export default function RouteFallback() {
  return (
    <Box data-testid="route-fallback" sx={{ display: 'grid', placeItems: 'center', minHeight: '40dvh' }}>
      <CircularProgress data-testid="route-fallback-spinner" />
    </Box>
  );
}
