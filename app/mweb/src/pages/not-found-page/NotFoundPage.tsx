import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';

/** 404 — shown for unknown routes. mWeb twin of the mobile NotFoundScreen. */
export default function NotFoundPage() {
  return (
    <Box data-testid="not-found-page" sx={{ minHeight: '60dvh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Stack spacing={1.5} alignItems="center" textAlign="center">
        <SearchOffIcon color="primary" sx={{ fontSize: 64 }} />
        <Typography variant="h2" fontWeight={950} sx={{ lineHeight: 1 }}>
          404
        </Typography>
        <Typography variant="h6" fontWeight={800}>
          Page not found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
          The page you’re looking for doesn’t exist or has moved.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
          Go to Home
        </Button>
      </Stack>
    </Box>
  );
}
