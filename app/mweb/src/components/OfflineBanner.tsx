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
      sx={{ bgcolor: '#b3261e', color: '#fff', px: 2, py: 0.75 }}
    >
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
        <WifiOffIcon fontSize="small" />
        <Typography variant="body2" fontWeight={800}>
          No internet connection
        </Typography>
      </Stack>
    </Box>
  );
}
