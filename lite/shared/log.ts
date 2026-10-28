import { createLogger } from '@duncit/logs';

/** Lite's own structured log stream for the web app and the console (page crashes, a failed icon list), apart from the main Duncit websites. */
export const liteLog = createLogger('website', 'lite');
