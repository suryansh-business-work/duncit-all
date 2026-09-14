import type { Translate } from '@duncit/shell';
import type { StressLevel, StressRunStatus, StressVerdictGrade } from './queries';

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
    app_boot: t('tech.stress.journeyAppBoot'),
    auth: t('tech.stress.journeyAuth'),
    home: t('tech.stress.journeyHome'),
    explore: t('tech.stress.journeyExplore'),
    clubs: t('tech.stress.journeyClubs'),
    search: t('tech.stress.journeySearch'),
    venues: t('tech.stress.journeyVenues'),
    happening_nearby: t('tech.stress.journeyHappeningNearby'),
    pod_detail: t('tech.stress.journeyPodDetail'),
    club_detail: t('tech.stress.journeyClubDetail'),
    venue_detail: t('tech.stress.journeyVenueDetail'),
    profile: t('tech.stress.journeyProfile'),
    hosts_venues: t('tech.stress.journeyHostsVenues'),
    pod_ideas: t('tech.stress.journeyPodIdeas'),
    membership: t('tech.stress.journeyMembership'),
    leaderboard: t('tech.stress.journeyLeaderboard'),
    gift_cards: t('tech.stress.journeyGiftCards'),
    help: t('tech.stress.journeyHelp'),
    api_health: t('tech.stress.journeyApiHealth'),
  };
  return labels[journey] ?? journey;
}

export function journeyHint(t: Translate, journey: string): string {
  const hints: Record<string, string> = {
    app_boot: t('tech.stress.journeyAppBootHint'),
    auth: t('tech.stress.journeyAuthHint'),
    home: t('tech.stress.journeyHomeHint'),
    explore: t('tech.stress.journeyExploreHint'),
    clubs: t('tech.stress.journeyClubsHint'),
    search: t('tech.stress.journeySearchHint'),
    venues: t('tech.stress.journeyVenuesHint'),
    happening_nearby: t('tech.stress.journeyHappeningNearbyHint'),
    pod_detail: t('tech.stress.journeyPodDetailHint'),
    club_detail: t('tech.stress.journeyClubDetailHint'),
    venue_detail: t('tech.stress.journeyVenueDetailHint'),
    profile: t('tech.stress.journeyProfileHint'),
    hosts_venues: t('tech.stress.journeyHostsVenuesHint'),
    pod_ideas: t('tech.stress.journeyPodIdeasHint'),
    membership: t('tech.stress.journeyMembershipHint'),
    leaderboard: t('tech.stress.journeyLeaderboardHint'),
    gift_cards: t('tech.stress.journeyGiftCardsHint'),
    help: t('tech.stress.journeyHelpHint'),
    api_health: t('tech.stress.journeyApiHealthHint'),
  };
  return hints[journey] ?? '';
}

export function gradeLabel(t: Translate, grade: StressVerdictGrade): string {
  const labels: Record<StressVerdictGrade, string> = {
    HEALTHY: t('tech.stress.gradeHealthy'),
    STRAINED: t('tech.stress.gradeStrained'),
    OVERLOADED: t('tech.stress.gradeOverloaded'),
    INCONCLUSIVE: t('tech.stress.gradeInconclusive'),
  };
  return labels[grade] ?? grade;
}

const GRADE_COLOR: Record<StressVerdictGrade, ChipColor> = {
  HEALTHY: 'success',
  STRAINED: 'warning',
  OVERLOADED: 'error',
  INCONCLUSIVE: 'default',
};

export const gradeColor = (grade: StressVerdictGrade): ChipColor => GRADE_COLOR[grade] ?? 'default';

export function levelLabel(t: Translate, level: StressLevel): string {
  const labels: Record<StressLevel, string> = {
    LOW: t('tech.stress.levelLow'),
    MEDIUM: t('tech.stress.levelMedium'),
    HIGH: t('tech.stress.levelHigh'),
  };
  return labels[level] ?? level;
}

const LEVEL_COLOR: Record<StressLevel, ChipColor> = { LOW: 'info', MEDIUM: 'warning', HIGH: 'error' };

export const levelColor = (level: StressLevel): ChipColor => LEVEL_COLOR[level] ?? 'default';

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
