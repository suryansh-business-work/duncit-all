import type { Translate } from '@duncit/shell';
import { minutesOf, type RunProgress } from './progress';
import type { TestsLiveRun } from './queries';

/** Under this, "about 1 min left" would overstate it. */
const MINUTE = 60;

/** What a live run is doing, in words: how long is left, or why there is no number. */
export function statusText(t: Translate, run: Pick<TestsLiveRun, 'status'>, progress: RunProgress): string {
  if (run.status === 'QUEUED') return t('tests.live.queued');
  if (run.status === 'STOPPING') return t('tests.live.stopping');
  if (progress.overdue) return t('tests.live.overdue');
  if (progress.remainingSeconds !== null) {
    if (progress.remainingSeconds < MINUTE) return t('tests.live.lessThanMinute');
    return t('tests.live.left', { vars: { minutes: String(minutesOf(progress.remainingSeconds)) } });
  }
  if (progress.elapsedSeconds !== null) {
    return t('tests.live.noEstimate', { vars: { minutes: String(minutesOf(progress.elapsedSeconds)) } });
  }
  return t('tests.live.starting');
}

/** Where the expected length came from — the run's own plan, or the runs before it. */
export const sourceText = (t: Translate, run: Pick<TestsLiveRun, 'planned'>) =>
  run.planned ? t('tests.live.planned') : t('tests.live.estimated');

/** `42%`, or null when there is no number to show. */
export const percentText = (t: Translate, progress: RunProgress) =>
  progress.percent === null ? null : t('tests.common.percent', { vars: { value: String(progress.percent) } });
