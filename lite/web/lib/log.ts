import { createLogger } from '@duncit/logs';

/** Lite's own structured log stream (page crashes, a browser without WebGL), apart from the main Duncit websites. */
export const liteLog = createLogger('website', 'lite');
