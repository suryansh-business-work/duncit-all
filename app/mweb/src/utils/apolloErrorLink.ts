import { onError } from '@apollo/client/link/error';
import { fallbackT } from '../i18n/fallback';

const NETWORK_FAILURE_PATTERN = /failed to fetch|network request failed|load failed/i;

/**
 * The name `fetch` gives an aborted request. It is the same name whether the
 * abort came from our own deadline or from the tab navigating away, which is
 * why the timeout wording is deliberately about waiting rather than failing.
 */
export const ABORT_ERROR_NAME = 'AbortError';

export const apolloErrorLink = onError(({ error }) => {
  if (!error) return;
  // Translated outside React: a link has no component tree around it, so it
  // reads the bundled copy the same way the module-level Zod schemas do.
  if (error.name === ABORT_ERROR_NAME) {
    error.message = fallbackT('mweb.common.requestTimedOut');
    return;
  }
  if (NETWORK_FAILURE_PATTERN.test(error.message)) {
    error.message = fallbackT('mweb.common.networkUnavailable');
  }
});
