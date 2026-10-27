import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PublicIcon from '@mui/icons-material/Public';
import SpeedIcon from '@mui/icons-material/Speed';
import MemoryIcon from '@mui/icons-material/Memory';
import TimerIcon from '@mui/icons-material/Timer';
import CableIcon from '@mui/icons-material/Cable';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StorageIcon from '@mui/icons-material/Storage';
import { useTranslation, type Translate } from '@duncit/shell';
import MetricTiles, { type MetricTile } from './MetricTiles';
import { SERVER_PULSE, type ServerPulse } from '../queries';
import { formatMs, formatPct, formatRps } from '../labels';

/** How often the pulse refreshes — its readings are five-second averages anyway. */
const PULSE_POLL_MS = 5_000;

function pulseTiles(t: Translate, pulse: ServerPulse): MetricTile[] {
  return [
    { id: 'users', label: t('tech.stress.pulseRealUsers'), value: pulse.real_users, hint: t('tech.stress.pulseRealUsersHint'), icon: <PeopleIcon /> },
    { id: 'visitors', label: t('tech.stress.pulseVisitors'), value: pulse.visitors, hint: t('tech.stress.pulseVisitorsHint'), icon: <PublicIcon /> },
    { id: 'sockets', label: t('tech.stress.pulseSockets'), value: pulse.sockets, hint: t('tech.stress.pulseSocketsHint'), icon: <CableIcon /> },
    {
      id: 'rps',
      label: t('tech.stress.pulseRps'),
      value: formatRps(pulse.rps_total),
      hint: t('tech.stress.pulseRpsHint', { vars: { stress: formatRps(pulse.rps_stress), inFlight: pulse.in_flight } }),
      icon: <SpeedIcon />,
    },
    { id: 'bots', label: t('tech.stress.pulseStressRps'), value: formatRps(pulse.rps_stress), icon: <SmartToyIcon /> },
    {
      id: 'latency',
      label: t('tech.stress.pulseServerP95'),
      value: formatMs(pulse.server_p95_ms),
      hint: t('tech.stress.pulse5xx', { vars: { count: pulse.status_5xx } }),
      icon: <TimerIcon />,
    },
    { id: 'cpu', label: t('tech.stress.pulseHostCpu'), value: formatPct(pulse.host_cpu_pct), percent: pulse.host_cpu_pct, hint: t('tech.stress.pulseLoad', { vars: { load: pulse.load_avg_1 } }), icon: <MemoryIcon /> },
    { id: 'memory', label: t('tech.stress.pulseHostMemory'), value: formatPct(pulse.host_memory_pct), percent: pulse.host_memory_pct, hint: t('tech.stress.pulseHeap', { vars: { heap: pulse.heap_used_mb, rss: pulse.rss_mb } }), icon: <StorageIcon /> },
    {
      id: 'loop',
      label: t('tech.stress.pulseEventLoop'),
      value: formatMs(pulse.event_loop_lag_ms),
      hint: t('tech.stress.pulseEventLoopP99', { vars: { p99: formatMs(pulse.event_loop_p99_ms) } }),
      icon: <TimerIcon />,
    },
  ];
}

/**
 * This server's live pulse: who is on the platform right now and how hard the
 * box is working. Polls on its own, so it keeps moving whether or not a run is
 * live — "how many people are on right now" is worth reading any time.
 */
export default function LivePulse() {
  const { t } = useTranslation();
  const { data, error } = useQuery<{ serverPulse: ServerPulse }>(SERVER_PULSE, {
    pollInterval: PULSE_POLL_MS,
    fetchPolicy: 'network-only',
  });
  const pulse = data?.serverPulse;
  const tiles = useMemo(() => (pulse ? pulseTiles(t, pulse) : []), [pulse, t]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('tech.stress.pulseTitle')}
            </Typography>
            <Chip size="small" color="success" variant="outlined" label={t('tech.stress.live')} />
            {(pulse?.users_by_surface ?? []).map((row) => (
              <Chip key={row.surface} size="small" label={`${row.surface} · ${row.users}`} />
            ))}
          </Stack>
          {error && <Alert severity="error">{error.message}</Alert>}
          <MetricTiles tiles={tiles} />
        </Stack>
      </CardContent>
    </Card>
  );
}
