import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { Box, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import SignalWifiStatusbar4BarIcon from '@mui/icons-material/SignalWifiStatusbar4Bar';
import SignalWifiStatusbarConnectedNoInternet4Icon from '@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4';
import { ReactInternetSpeedMeter } from './internet-meter';

/** Below this, a video call is going to stutter. Megabytes per second. */
const SLOW_MBPS = 1;

interface Props {
  /**
   * A file the meter downloads over and over to time it, and its exact size in
   * bytes. There is no default on purpose: the package ships one pointing at a
   * stranger's CDN, and seventeen portals re-fetching a 1.7 MB photo every few
   * seconds is somebody else's bandwidth bill and our users' data. Supply one
   * of ours, or the meter does not run at all.
   */
  probeUrl?: string;
  probeBytes?: number;
  /** How often to measure. Long by default — measuring costs the bandwidth it
   * is measuring, which matters most during the call it is watching. */
  intervalMs?: number;
}

/**
 * How good this connection is, along the bottom.
 *
 * Shown as a bar rather than a number because the question people have is "is
 * it me?", not "how many megabits". Red and a word when it is bad enough to
 * explain what they are hearing.
 */
export default function ConnectionMeter({
  probeUrl,
  probeBytes,
  intervalMs = 15_000,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [mbps, setMbps] = useState<number | null>(null);

  // Nothing to measure with: draw nothing rather than reach for a URL that is
  // not ours.
  if (!probeUrl || !probeBytes) return null;

  const slow = mbps !== null && mbps < SLOW_MBPS;
  // A bar needs a ceiling; 10 MB/s is comfortably past "fine for video".
  const filled = mbps === null ? 0 : Math.min(100, (mbps / 10) * 100);

  return (
    <Box sx={{ px: 1.5, pb: 0.75 }}>
      <ReactInternetSpeedMeter
        // The package's own alert would be a modal over a live call. We render
        // the result ourselves.
        outputType="empty"
        pingInterval={intervalMs}
        thresholdUnit="megabyte"
        threshold={SLOW_MBPS}
        imageUrl={probeUrl}
        downloadSize={String(probeBytes)}
        callbackFunctionOnNetworkDown={(speed: number) => setMbps(Number(speed) || 0)}
        callbackFunctionOnNetworkTest={(speed: number) => setMbps(Number(speed) || 0)}
      />

      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Tooltip title={mbps === null ? 'Checking your connection' : `${mbps.toFixed(1)} MB/s`}>
          {slow ? (
            <SignalWifiStatusbarConnectedNoInternet4Icon sx={{ fontSize: 15, color: 'error.main' }} />
          ) : (
            <SignalWifiStatusbar4BarIcon sx={{ fontSize: 15, color: 'success.main' }} />
          )}
        </Tooltip>
        <LinearProgress
          variant={mbps === null ? 'indeterminate' : 'determinate'}
          value={filled}
          color={slow ? 'error' : 'success'}
          sx={{ flex: 1, height: 4, borderRadius: 2 }}
          aria-label={t('shell.chat.call.quality')}
        />
        {slow && (
          <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
            Slow connection
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
