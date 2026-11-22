import { createLogger, fireAndForget } from '@duncit/logs';

const logger = createLogger('portal');

/**
 * Run a promise the UI deliberately does not wait on (a copy, a share toggle,
 * an analytics hit), logging a rejection under the prompt library instead of
 * dropping it the way `void promise` would.
 */
export function runInBackground(promise: Promise<unknown>, action: string): void {
  fireAndForget(promise, logger, 'ai-prompts', action);
}
