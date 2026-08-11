import { Box, Card, Stack, Typography } from '@mui/material';
import type { HostAccountHealth } from './queries';

const BAND_COLOR: Record<HostAccountHealth['band'], 'success' | 'warning' | 'error'> = {
  GREEN: 'success',
  YELLOW: 'warning',
  RED: 'error',
};

const BAND_HINT: Record<HostAccountHealth['band'], string> = {
  GREEN: 'Your account is in good standing.',
  YELLOW: 'A few things need attention — complete your verification to rank higher.',
  RED: 'Your account needs attention. Contact support if this looks wrong.',
};

interface Props {
  health: HostAccountHealth | null;
  podsCompleted: number;
}

/** Profile health — the score that decides where a host's pods rank. */
export default function HostHealthCard({ health, podsCompleted }: Readonly<Props>) {
  if (!health) return null;
  const color = BAND_COLOR[health.band];

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 56,
            height: 56,
            flex: '0 0 auto',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${color}.main`,
            color: `${color}.contrastText`,
            fontWeight: 950,
            fontSize: 18,
          }}
        >
          {health.total_score}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={900}>
            Profile health
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {BAND_HINT[health.band]}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h6" fontWeight={950}>
            {podsCompleted}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            pods settled
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
