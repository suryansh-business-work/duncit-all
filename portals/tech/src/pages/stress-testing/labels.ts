import type { Translate } from '@duncit/shell';
import type { StressRunStatus } from './queries';

/**
 * Words for the codes the server sends. Every key is written out literally —
 * the localization gates read keys straight off the source, so a composed key
 * built from the status code would ship untranslatable and unchecked.
 */

export function statusLabel(t: Translate, status: StressRunStatus): string {
  const labels: Record<StressRunStatus, string> = {
    QUEUED: t('tech.stress.statusQueued'),
    RUNNING: t('tech.stress.statusRunning'),
    STOPPING: t('tech.stress.statusStopping'),
    COMPLETED: t('tech.stress.statusCompleted'),
    ABORTED: t('tech.stress.statusAborted'),
    FAILED: t('tech.stress.statusFailed'),
  };
  return labels[status] ?? status;
}

export type ChipColor = 'default' | 'info' | 'warning' | 'success' | 'error';

const STATUS_COLOR: Record<StressRunStatus, ChipColor> = {
  QUEUED: 'default',
  RUNNING: 'info',
  STOPPING: 'warning',
  COMPLETED: 'success',
  ABORTED: 'warning',
  FAILED: 'error',
};

export const statusColor = (status: StressRunStatus): ChipColor => STATUS_COLOR[status] ?? 'default';

export function environmentLabel(t: Translate, environment: string): string {
  if (environment === 'production') return t('tech.stress.envProduction');
  if (environment === 'staging') return t('tech.stress.envStaging');
  return t('tech.stress.envLocal');
}

export const environmentColor = (environment: string): ChipColor =>
  environment === 'production' ? 'error' : 'info';

export function journeyLabel(t: Translate, journey: string): string {
  const labels: Record<string, string> = {
    home: t('tech.stress.journeyHome'),
    explore: t('tech.stress.journeyExplore'),
    clubs: t('tech.stress.journeyClubs'),
    search: t('tech.stress.journeySearch'),
    venues: t('tech.stress.journeyVenues'),
    api_health: t('tech.stress.journeyApiHealth'),
  };
  return labels[journey] ?? journey;
}

export function journeyHint(t: Translate, journey: string): string {
  const hints: Record<string, string> = {
    home: t('tech.stress.journeyHomeHint'),
    explore: t('tech.stress.journeyExploreHint'),
    clubs: t('tech.stress.journeyClubsHint'),
    search: t('tech.stress.journeySearchHint'),
    venues: t('tech.stress.journeyVenuesHint'),
    api_health: t('tech.stress.journeyApiHealthHint'),
  };
  return hints[journey] ?? '';
}

/* ── numbers ─────────────────────────────────────────────────────────────── */

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

export const formatCount = (n: number | null | undefined): string => compact.format(n ?? 0);

export const formatMs = (n: number | null | undefined): string => {
  const ms = n ?? 0;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
};

export const formatPct = (n: number | null | undefined): string => `${Math.round((n ?? 0) * 10) / 10}%`;

export const formatRps = (n: number | null | undefined): string => `${Math.round((n ?? 0) * 10) / 10}/s`;

/** 125 → "2m 5s"; null → an em dash. */
export function formatSeconds(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) return `${rest}s`;
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}
