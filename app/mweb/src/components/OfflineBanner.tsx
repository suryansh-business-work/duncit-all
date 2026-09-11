import { Box, Stack, Typography } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/** App-wide "no internet" warning bar — mWeb twin of the mobile OfflineBanner. */
export default function OfflineBanner() {
  const { isOffline } = useOnlineStatus();
  if (!isOffline) return null;

  return (
    <Box
      data-testid="offline-banner"
      role="status"
      aria-live="polite"
      sx={{ bgcolor: 'error.main', color: 'error.contrastText', px: 2, py: 1 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
        <WifiOffIcon sx={{ fontSize: 16 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>No internet connection</Typography>
      </Stack>
    </Box>
  );
}
