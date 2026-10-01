import type { ContentReport } from '../../../graphql/reports';

/**
 * What became of the reported content, as a translation key.
 *
 * Three answers, not two: "we took it down" and "it went away by itself" (a
 * story that expired, a post its owner deleted) are different facts, and only
 * the first is something Legal did. The table chip and the detail dialog both
 * read this, so they cannot describe the same report two ways.
 */
export function contentStateKey(
  report: Pick<ContentReport, 'target_live' | 'target_removed_at'>,
): string {
  if (report.target_removed_at) return 'reportLogs.contentRemoved';
  if (report.target_live) return 'reportLogs.contentLive';
  return 'reportLogs.contentGone';
}
