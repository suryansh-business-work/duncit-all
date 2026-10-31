import type { useTranslation } from '@duncit/app-settings';
import { ACTOR_KIND_LABEL } from './copy';
import type { MarketingRunActor } from './queries';

export type Translate = ReturnType<typeof useTranslation>['t'];

const MS_PER_SECOND = 1000;
const PER_UNIT = 60;

/** Milliseconds from start to end, or null when either is missing, unreadable or out of order. */
export function durationMs(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isNaN(ms) || ms < 0 ? null : ms;
}

/** 850 ms · 12s · 3m 20s · 1h 5m — compact enough for a table cell. */
export function formatDuration(ms: number, t: Translate): string {
  if (ms < MS_PER_SECOND) return t('marketing.runs.durationMs', { vars: { ms } });
  const seconds = Math.round(ms / MS_PER_SECOND);
  if (seconds < PER_UNIT) return t('marketing.runs.durationSeconds', { vars: { s: seconds } });
  const minutes = Math.floor(seconds / PER_UNIT);
  if (minutes < PER_UNIT) {
    return t('marketing.runs.durationMinutes', { vars: { m: minutes, s: seconds % PER_UNIT } });
  }
  return t('marketing.runs.durationHours', { vars: { h: Math.floor(minutes / PER_UNIT), m: minutes % PER_UNIT } });
}

/** The actor's name, or what kind of actor it was when it has none (the system, an unnamed agent). */
export const actorLabel = (actor: MarketingRunActor, t: Translate): string =>
  actor.name || t(ACTOR_KIND_LABEL[actor.kind]);
