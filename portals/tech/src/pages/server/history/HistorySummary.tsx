import { useMemo } from 'react';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SaveIcon from '@mui/icons-material/Save';
import TimerIcon from '@mui/icons-material/Timer';
import VerifiedIcon from '@mui/icons-material/Verified';
import SpeedIcon from '@mui/icons-material/Speed';
import { useTranslation, type Translate } from '@duncit/shell';
import MetricTiles, { type MetricTile } from '../../stress-testing/components/MetricTiles';
import { formatCount, formatMs, formatPct } from '../../stress-testing/labels';
import { formatBytes } from '../format';
import type { ServerHistorySummary } from './queries';

interface Props {
  summary: ServerHistorySummary;
  periodDays: number;
}

const NO_READING = '—';

const pctOrDash = (n: number | null) => (n == null ? NO_READING : formatPct(n));
const msOrDash = (n: number | null) => (n == null ? NO_READING : formatMs(n));

function diskHint(t: Translate, summary: ServerHistorySummary): string {
  if (summary.daysUntilDiskFull == null || summary.diskGrowthBytesPerDay == null) return t('tech.server.tileDiskSteady');
  return t('tech.server.tileDiskFull', {
    vars: { days: summary.daysUntilDiskFull, growth: formatBytes(summary.diskGrowthBytesPerDay) },
  });
}

function tiles(t: Translate, summary: ServerHistorySummary, periodDays: number): MetricTile[] {
  return [
    {
      id: 'days',
      label: t('tech.server.tileDays'),
      value: summary.daysWithData,
      hint: t('tech.server.tileDaysHint', { vars: { days: periodDays } }),
      icon: <EventAvailableIcon />,
    },
    {
      id: 'cpu',
      label: t('tech.server.tileCpu'),
      value: pctOrDash(summary.cpuAvgPct),
      percent: summary.cpuAvgPct ?? undefined,
      hint: t('tech.server.tilePeak', { vars: { peak: pctOrDash(summary.cpuPeakPct) } }),
      icon: <MemoryIcon />,
    },
    {
      id: 'memory',
      label: t('tech.server.tileMemory'),
      value: pctOrDash(summary.memoryAvgPct),
      percent: summary.memoryAvgPct ?? undefined,
      hint: t('tech.server.tilePeak', { vars: { peak: pctOrDash(summary.memoryPeakPct) } }),
      icon: <StorageIcon />,
    },
    {
      id: 'disk',
      label: t('tech.server.tileDisk'),
      value: pctOrDash(summary.diskPct),
      percent: summary.diskPct ?? undefined,
      hint: diskHint(t, summary),
      icon: <SaveIcon />,
    },
    {
      id: 'latency',
      label: t('tech.server.tileLatency'),
      value: msOrDash(summary.latencyP95Ms),
      hint: t('tech.server.tileLatencyHint', { vars: { probe: msOrDash(summary.probeLatencyMs) } }),
      icon: <TimerIcon />,
    },
    {
      id: 'uptime',
      label: t('tech.server.tileUptime'),
      value: pctOrDash(summary.uptimePct),
      hint: t('tech.server.tileUptimeHint'),
      icon: <VerifiedIcon />,
    },
    {
      id: 'requests',
      label: t('tech.server.tileRequests'),
      value: formatCount(summary.requests),
      hint: t('tech.server.tileRequestsHint', { vars: { errors: formatCount(summary.errors5xx) } }),
      icon: <SpeedIcon />,
    },
  ];
}

/** The month in seven numbers — what the charts below it draw day by day. */
export default function HistorySummary({ summary, periodDays }: Readonly<Props>) {
  const { t } = useTranslation();
  const list = useMemo(() => tiles(t, summary, periodDays), [t, summary, periodDays]);
  return <MetricTiles tiles={list} minWidth={180} />;
}
