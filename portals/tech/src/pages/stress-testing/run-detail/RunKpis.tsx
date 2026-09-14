import { useMemo } from 'react';
import GroupsIcon from '@mui/icons-material/Groups';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import MemoryIcon from '@mui/icons-material/Memory';
import PeopleIcon from '@mui/icons-material/People';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { useTranslation, type Translate } from '@duncit/shell';
import MetricTiles, { type MetricTile } from '../components/MetricTiles';
import { isLiveRun, type StressRun, type StressSample } from '../queries';
import { formatCount, formatMs, formatPct, formatRps, formatSeconds } from '../labels';

interface Props {
  run: StressRun;
  latest: StressSample | null;
}

/** While live: the newest sample, with the peak so far as the hint. Once ended: the summary. */
function liveTiles(t: Translate, run: StressRun, s: StressSample | null): MetricTile[] {
  const peak = (value: string) => t('tech.stress.peak', { vars: { value } });
  return [
    { id: 'vus', label: t('tech.stress.kpiVirtualUsers'), value: formatCount(s?.load.active_vus), hint: peak(formatCount(run.peaks.virtual_users)), icon: <GroupsIcon /> },
    { id: 'bots', label: t('tech.stress.kpiBrowserBots'), value: formatCount(s?.load.active_bots), hint: peak(formatCount(run.peaks.browser_bots)), icon: <SmartToyIcon /> },
    { id: 'rps', label: t('tech.stress.kpiRps'), value: formatRps(s?.load.rps), hint: peak(formatRps(run.peaks.rps)), icon: <SpeedIcon /> },
    { id: 'p95', label: t('tech.stress.kpiP95'), value: formatMs(s?.load.p95_ms), hint: peak(formatMs(run.peaks.p95_ms)), icon: <TimerIcon /> },
    { id: 'errors', label: t('tech.stress.kpiErrorRate'), value: formatPct(s?.load.error_rate_pct), hint: peak(formatPct(run.peaks.error_rate_pct)), icon: <ErrorOutlinedIcon /> },
    { id: 'cpu', label: t('tech.stress.kpiHostCpu'), value: formatPct(s?.server.host_cpu_pct), percent: s?.server.host_cpu_pct ?? 0, hint: peak(formatPct(run.peaks.host_cpu_pct)), icon: <MemoryIcon /> },
    { id: 'real', label: t('tech.stress.kpiRealUsers'), value: formatCount((s?.server.real_users ?? 0) + (s?.server.visitors ?? 0)), hint: peak(formatCount(run.peaks.real_users)), icon: <PeopleIcon /> },
    { id: 'loop', label: t('tech.stress.kpiEventLoop'), value: formatMs(s?.server.event_loop_lag_ms), hint: peak(formatMs(run.peaks.event_loop_lag_ms)), icon: <HourglassBottomIcon /> },
    { id: 'elapsed', label: t('tech.stress.kpiElapsed'), value: formatSeconds(run.duration_seconds), icon: <TimerIcon /> },
  ];
}

function summaryTiles(t: Translate, run: StressRun): MetricTile[] {
  const sum = run.summary;
  if (!sum) return liveTiles(t, run, null);
  return [
    { id: 'requests', label: t('tech.stress.kpiRequests'), value: formatCount(sum.requests), hint: t('tech.stress.kpiAvgRps', { vars: { rps: formatRps(sum.avg_rps) } }), icon: <SpeedIcon /> },
    { id: 'errors', label: t('tech.stress.kpiErrorRate'), value: formatPct(sum.error_rate_pct), hint: t('tech.stress.kpiErrorCount', { vars: { count: formatCount(sum.errors) } }), icon: <ErrorOutlinedIcon /> },
    { id: 'p50', label: t('tech.stress.kpiP50'), value: formatMs(sum.p50_ms), hint: t('tech.stress.kpiAvg', { vars: { ms: formatMs(sum.avg_ms) } }), icon: <TimerIcon /> },
    { id: 'p95', label: t('tech.stress.kpiP95'), value: formatMs(sum.p95_ms), icon: <TimerIcon /> },
    { id: 'p99', label: t('tech.stress.kpiP99'), value: formatMs(sum.p99_ms), icon: <TimerIcon /> },
    { id: 'pages', label: t('tech.stress.kpiPageLoad'), value: formatMs(sum.avg_page_load_ms), hint: t('tech.stress.kpiNavigations', { vars: { count: formatCount(sum.navigations), errors: formatCount(sum.navigation_errors) } }), icon: <SmartToyIcon /> },
    { id: 'vus', label: t('tech.stress.kpiPeakUsers'), value: formatCount(run.peaks.virtual_users), icon: <GroupsIcon /> },
    { id: 'cpu', label: t('tech.stress.kpiPeakCpu'), value: formatPct(run.peaks.host_cpu_pct), percent: run.peaks.host_cpu_pct, icon: <MemoryIcon /> },
    { id: 'elapsed', label: t('tech.stress.kpiElapsed'), value: formatSeconds(run.duration_seconds), icon: <HourglassBottomIcon /> },
  ];
}

export default function RunKpis({ run, latest }: Readonly<Props>) {
  const { t } = useTranslation();
  const tiles = useMemo(
    () => (isLiveRun(run.status) ? liveTiles(t, run, latest) : summaryTiles(t, run)),
    [run, latest, t]
  );
  return <MetricTiles tiles={tiles} minWidth={160} />;
}
