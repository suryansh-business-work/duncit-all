import { EM_DASH } from '@duncit/table';
import type { Translate } from '@duncit/shell';

/**
 * Number formatting for the unit and regression pages. The unit words come
 * from the bundle, so "2m 5s" reads as the reader's language writes it.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export function formatDuration(t: Translate, ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return EM_DASH;
  if (ms < SECOND) return t('testsUnit.duration.ms', { vars: { value: Math.round(ms) } });
  if (ms < MINUTE) return t('testsUnit.duration.seconds', { vars: { value: (ms / SECOND).toFixed(1) } });
  if (ms < HOUR) {
    const m = Math.floor(ms / MINUTE);
    return t('testsUnit.duration.minutes', { vars: { m, s: Math.round((ms % MINUTE) / SECOND) } });
  }
  const h = Math.floor(ms / HOUR);
  return t('testsUnit.duration.hours', { vars: { h, m: Math.round((ms % HOUR) / MINUTE) } });
}

export function formatPct(t: Translate, pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return EM_DASH;
  return t('testsUnit.common.percent', { vars: { value: pct.toFixed(1) } });
}

/** A signed percentage-point change, e.g. +1.2 pp; an em dash when either side is missing. */
export function formatDelta(t: Translate, delta: number | null | undefined): string {
  if (delta == null || !Number.isFinite(delta)) return EM_DASH;
  const sign = delta > 0 ? '+' : '';
  return t('testsUnit.common.points', { vars: { value: `${sign}${delta.toFixed(1)}` } });
}

/** The first seven characters, the way GitHub shows a commit. */
export const shortSha = (sha: string | null | undefined): string => (sha ? sha.slice(0, 7) : EM_DASH);

/** The run's GitHub commit page, derived from its run URL — both live on the same repo. */
export function commitUrl(runUrl: string, sha: string): string {
  const base = runUrl.split('/actions/')[0];
  return base && sha && base !== runUrl ? `${base}/commit/${sha}` : '';
}

/** The describe blocks around a test, outermost first, as one line. */
export const describePath = (titles: readonly string[]): string => (titles.length > 0 ? titles.join(' › ') : EM_DASH);

/** The first non-blank line of a failure — the dialog has the rest. */
export const firstLine = (text: string): string =>
  text.split('\n').find((line) => line.trim())?.trim() ?? EM_DASH;
