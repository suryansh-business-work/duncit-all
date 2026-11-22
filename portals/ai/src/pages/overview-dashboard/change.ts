import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Which way a figure moving is good news: fewer errors, more people, or neither (spend just follows use). */
export type Better = 'up' | 'down' | 'neither';

/** "+12.5% vs previous period" — or why there is nothing to compare with. */
export function changeHint(t: Translate, percent: number | null): string {
  if (percent === null) return t('ai.overview.changeNone');
  if (percent === 0) return t('ai.overview.changeFlat');
  if (percent > 0) return t('ai.overview.changeUp', { vars: { value: percent } });
  return t('ai.overview.changeDown', { vars: { value: percent } });
}

/** The same for a rate, whose change is in percentage points. */
export function pointsHint(t: Translate, points: number | null): string {
  if (points === null) return t('ai.overview.changeNone');
  if (points === 0) return t('ai.overview.changeFlat');
  if (points > 0) return t('ai.overview.pointsUp', { vars: { value: points } });
  return t('ai.overview.pointsDown', { vars: { value: points } });
}

/**
 * The theme colour of a change: green when it moved the good way, red when it
 * moved the bad way, the default caption colour otherwise. The sign is always
 * in the text too, so the colour is never the only signal.
 */
export function changeColor(change: number | null, better: Better): string | undefined {
  if (change === null || change === 0 || better === 'neither') return undefined;
  const good = better === 'up' ? change > 0 : change < 0;
  return good ? 'success.main' : 'error.main';
}
