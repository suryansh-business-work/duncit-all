import type { Translate } from '@duncit/shell';
import { firstGraphQLError, parseApiError } from '@duncit/utils';

/** The server refuses a discovery with NOT_CONFIGURED while the Serper key is missing. */
export const isNotConfigured = (error: unknown): boolean => firstGraphQLError(error)?.extensions?.code === 'NOT_CONFIGURED';

/**
 * Why a discovery could not be started, cancelled or retried, in the reader's
 * language for the refusals the server names by code, and the server's own
 * reason for everything else (limits, a job still running).
 */
export function discoveryErrorMessage(error: unknown, t: Translate): string {
  if (isNotConfigured(error)) return t('crm.leadResearch.notConfiguredBody');
  if (firstGraphQLError(error)?.extensions?.code === 'FORBIDDEN') return t('crm.leadResearch.cancelForbidden');
  return parseApiError(error);
}
