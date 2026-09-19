/**
 * The in-flight request counter now lives in `@duncit/ui` beside the bar it
 * drives, so the pet store (which does not mount the shell) reads the same one.
 * Re-exported here so the shell's own imports and its public surface stand.
 */
export { getInFlightRequests, subscribeRequests, trackingFetch } from '@duncit/ui';
