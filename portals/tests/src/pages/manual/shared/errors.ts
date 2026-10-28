import type { Translate } from '@duncit/shell';
import { firstGraphQLError } from '@duncit/utils';
import { testsLog } from '../../../lib/logger';

/** The server refused a write because someone else changed the record first. */
export const isConflict = (err: unknown): boolean => firstGraphQLError(err)?.extensions?.code === 'CONFLICT';

/**
 * What to tell the person when a request fails: the localized conflict notice,
 * the server's own validation reasons, or the page's localized fallback. The
 * failure is logged with the page and component that hit it — never swallowed.
 */
export function manualErrorText(
  t: Translate,
  err: unknown,
  fallback: string,
  where: { page: string; component: string }
): string {
  testsLog.warn(where.page, where.component, { error: err });
  if (isConflict(err)) return t('testsManual.errors.conflict');
  const first = firstGraphQLError(err);
  const reasons = first?.extensions?.errors;
  if (Array.isArray(reasons) && reasons.length > 0) return reasons.map(String).join(' ');
  return first?.message ?? fallback;
}
