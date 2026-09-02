import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { autoPodTimeLeft, type AutoPodLabels } from '@duncit/utils';

export interface AutoPodExpiryNoteProps {
  /** `row.venue_expires_at` — null draws nothing. */
  expiresAt: string | null | undefined;
  /** The admin-configured clock's "now" (rule 11), not the device's. */
  nowMs: number;
  labels: AutoPodLabels;
}

/**
 * "Removed from your list in 5h 12m" — the venue card's countdown to the
 * offer leaving their queue (Pod Settings decides the window). Nothing once
 * the deadline has passed: the server drops the row on the next read.
 * Native twin: `AutoPodExpiryNote` in the mobile app (rule 27).
 */
export function AutoPodExpiryNote({ expiresAt, nowMs, labels }: Readonly<AutoPodExpiryNoteProps>) {
  const left = autoPodTimeLeft(expiresAt, nowMs);
  if (!left) return null;
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }} data-testid="auto-pod-expiry">
      <TimerOutlinedIcon sx={{ fontSize: 16, color: 'warning.main' }} />
      <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
        {labels.removedIn(left.hours, left.minutes)}
      </Typography>
    </Stack>
  );
}
