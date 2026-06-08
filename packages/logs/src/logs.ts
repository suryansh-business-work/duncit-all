import { PORTALS, WEBSITES, type PortalKey, type WebsiteKey } from './config';
import { consoleTransport } from './transport';
import type { LevelFns, LogLevel, LogRecord, Transport } from './types';

// One process-wide transport. Apps call configureLogs() once at startup
// (httpTransport in browsers/mobile, an OTLP transport in the server).
let activeTransport: Transport = consoleTransport;

export function configureLogs(transport: Transport): void {
  activeTransport = transport;
}

function emit(
  base: Pick<LogRecord, 'app' | 'portal'>,
  level: LogLevel,
  page: string,
  component: string,
  data?: Record<string, unknown>,
): void {
  try {
    activeTransport({ ...base, level, page, component, data, timestamp: new Date().toISOString() });
  } catch {
    /* logging must never throw */
  }
}

function levelFns(base: Pick<LogRecord, 'app' | 'portal'>): LevelFns {
  return {
    debug: (page, component, data) => emit(base, 'debug', page, component, data),
    info: (page, component, data) => emit(base, 'info', page, component, data),
    warn: (page, component, data) => emit(base, 'warn', page, component, data),
    error: (page, component, data) => emit(base, 'error', page, component, data),
  };
}

// logs.portal.<name> / logs.website.<name> — built from the global lists.
const portal = PORTALS.reduce(
  (acc, key) => {
    acc[key] = levelFns({ app: 'portal', portal: key });
    return acc;
  },
  {} as Record<PortalKey, LevelFns>,
);

const website = WEBSITES.reduce(
  (acc, key) => {
    acc[key] = levelFns({ app: 'website', portal: key });
    return acc;
  },
  {} as Record<WebsiteKey, LevelFns>,
);

/**
 * Global structured logger.
 *   logs.server.error(page, component, { ...context })
 *   logs.mWeb.info(page, component, { ...context })
 *   logs.mobileApp.error(page, component, { ...context })
 *   logs.portal.crm.error(page, component, { ...context })
 *   logs.website.duncit.error(page, component, { ...context })
 */
export const logs = {
  server: levelFns({ app: 'server' }),
  mWeb: levelFns({ app: 'mWeb' }),
  mobileApp: levelFns({ app: 'mobileApp' }),
  portal,
  website,
};
