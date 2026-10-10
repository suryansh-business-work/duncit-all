import { useEffect, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { clockDisplayMs, clockElapsedMs, formatClock } from '@duncit/utils';
import type { PodChallengeTool } from '@duncit/gql-types';
import { useTranslation } from '../../i18n/useTranslation';
import { parseConfig } from './challengeView';

interface Props {
  tool: Pick<PodChallengeTool, 'label' | 'config_json' | 'clock_running' | 'clock_elapsed_ms'>;
  receivedAt: number;
  large?: boolean;
}

/** Ticks once a second, and only while the clock is running. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = globalThis.setInterval(() => setNow(Date.now()), 1000);
    return () => globalThis.clearInterval(id);
  }, [active]);
  return now;
}

/** A challenge clock: stopwatch time, or the countdown's time remaining. */
export default function ChallengeClock({ tool, receivedAt, large }: Readonly<Props>) {
  const { t } = useTranslation();
  const now = useNow(tool.clock_running);
  const config = parseConfig(tool.config_json);
  const elapsed = clockElapsedMs(tool, receivedAt, now);
  const shown = formatClock(clockDisplayMs(elapsed, String(config.mode ?? 'STOPWATCH'), Number(config.duration_seconds ?? 0)));
  const state = t(tool.clock_running ? 'mweb.challenge.clockRunning' : 'mweb.challenge.clockStopped');

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <TimerOutlinedIcon fontSize={large ? 'large' : 'small'} color={tool.clock_running ? 'primary' : 'disabled'} />
      <Typography
        role="timer"
        aria-label={`${tool.label}: ${shown}, ${state}`}
        variant={large ? 'h2' : 'h6'}
        component="span"
        sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}
      >
        {shown}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {tool.label}
      </Typography>
    </Stack>
  );
}
