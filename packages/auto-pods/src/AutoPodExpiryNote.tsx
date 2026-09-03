import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { ambientDateFormatter } from '@duncit/datetime';
import { autoPodTimeLeft, type AutoPodLabels } from '@duncit/utils';

export interface AutoPodExpiryNoteProps {
  /** `row.expires_at` — null draws nothing. */
  expiresAt: string | null | undefined;
  labels: AutoPodLabels;
}

/** The admin-configured clock's "now" (rule 11), re-read once a second while
 * there is a deadline to count. */
function useClockNow(counting: boolean): number {
  const [nowMs, setNowMs] = useState(() => ambientDateFormatter().clock.nowMs());
  useEffect(() => {
    if (!counting) return undefined;
    const id = setInterval(() => setNowMs(ambientDateFormatter().clock.nowMs()), 1000);
    return () => clearInterval(id);
  }, [counting]);
  return nowMs;
}

/**
 * "Expires in 5h 12m 30s" — every card's live countdown to the offer being
 * released unless everyone has enrolled (Pod Settings decides the windows).
 * It ticks on its own, so a page of cards re-renders one line a second rather
 * than the whole queue. Nothing once the deadline has passed: the server
 * releases the offer on its next sweep. Native twin: `AutoPodExpiryNote` in
 * the mobile app (rule 27).
 */
export function AutoPodExpiryNote({ expiresAt, labels }: Readonly<AutoPodExpiryNoteProps>) {
  const nowMs = useClockNow(!!expiresAt);
  const left = autoPodTimeLeft(expiresAt, nowMs);
  if (!left) return null;
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }} data-testid="auto-pod-expiry">
      <TimerOutlinedIcon sx={{ fontSize: 16, color: 'warning.main' }} />
      <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
        {labels.expiresIn(left.hours, left.minutes, left.seconds)}
      </Typography>
    </Stack>
  );
}
