import type { ReactElement } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { TRIGGER_PX } from '../hooks/usePullToRefresh';

interface Props {
  /** Post-resistance drag distance from `usePullToRefresh`. */
  pull: number;
  refreshing: boolean;
  /** Announced while the refetch runs — the caller's own translated string. */
  label: string;
}

/** Height the spinner row holds while the refetch is in flight. */
const SPINNER_ROW_PX = 40;

/**
 * The spinner a pull-to-refresh gesture drags into view: it fills as the finger
 * travels, so the host can see when the gesture is armed, then spins on its own
 * until the refetch settles.
 */
export default function PullToRefreshIndicator({ pull, refreshing, label }: Readonly<Props>) {
  const height = refreshing ? SPINNER_ROW_PX : pull;
  if (height <= 0) return null;

  const armed = Math.min(100, (pull / TRIGGER_PX) * 100);
  let spinner: ReactElement;
  if (refreshing) {
    spinner = <CircularProgress size={22} aria-label={label} />;
  } else {
    spinner = (
      <CircularProgress
        size={22}
        variant="determinate"
        value={armed}
        sx={{ opacity: 0.35 + armed / 200 }}
      />
    );
  }

  return (
    <Box
      data-testid="pull-to-refresh-indicator"
      role={refreshing ? 'status' : undefined}
      sx={{
        height,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        // Only the release animates; while the finger is down the height must
        // track it 1:1 or the pull feels laggy.
        transition: refreshing ? 'height 160ms ease' : undefined,
      }}
    >
      {spinner}
    </Box>
  );
}
