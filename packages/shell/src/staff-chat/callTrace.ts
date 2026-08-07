import { createLogger } from '@duncit/logs';

/**
 * A running account of one call, from the browser.
 *
 * Calls are peer to peer, so almost nothing about one is visible from the
 * server — and when a call dies on the way out it leaves no message, no record
 * and no relay traffic. That combination is unreadable without a trace: it was
 * only the pairs of MISSED rows in the database, both sides naming the same
 * user, that showed a call had been declining itself.
 *
 * It goes to the console AND to the log sink the portal already configures, so
 * a failure can be read afterwards by whoever is fixing it rather than only by
 * whoever happened to have devtools open at the time. `portal` is left to the
 * shell's configureLogs context, because seventeen consoles share this file.
 */
const logger = createLogger('portal');

/** Everything that happens to a call, in the order it happened. */
export function traceCall(step: string, detail?: Record<string, unknown>): void {
  logger.info('staff-chat', 'call', { msg: `call: ${step}`, step, ...detail });
}

/** The same, for the steps that mean something went wrong. */
export function traceCallFailure(step: string, detail?: Record<string, unknown>): void {
  logger.warn('staff-chat', 'call', { msg: `call: ${step}`, step, ...detail });
}
