import { Link as RouterLink } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { DuncitButton } from '@duncit/buttons';

/** 404 — shown for unknown routes. mWeb twin of the mobile NotFoundScreen. */
export default function NotFoundPage() {
  return (
    <Box data-testid="not-found-page" sx={{ minHeight: '60dvh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Stack
        spacing={1.5}
        sx={{
          alignItems: "center",
          textAlign: "center"
        }}>
        <SearchOffIcon color="primary" sx={{ fontSize: 64 }} />
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            lineHeight: 1
          }}>
          404
        </Typography>
        <Typography variant="h6" sx={{
          fontWeight: 600
        }}>
          Page not found
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            maxWidth: 360
          }}>
          The page you’re looking for doesn’t exist or has moved.
        </Typography>
        <DuncitButton component={RouterLink} to="/" variant="contained" sx={{ mt: 1, borderRadius: '16px', textTransform: 'none', fontWeight: 700 }}>
          Go to Home
        </DuncitButton>
      </Stack>
    </Box>
  );
}
