import type { LevelFns } from './types';

interface CaptureOptions {
  /** Page label for captured logs. Defaults to location.pathname in browsers. */
  page?: string;
  /** Console methods to forward. Defaults to error + warn. */
  levels?: Array<'error' | 'warn'>;
  /** Also forward window 'error' + 'unhandledrejection'. Defaults to true. */
  windowErrors?: boolean;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function argMessage(args: unknown[]): string {
  return args
    .map((a) => (a instanceof Error ? a.stack || `${a.name}: ${a.message}` : typeof a === 'string' ? a : safeJson(a)))
    .join(' ')
    .slice(0, 4000);
}

function currentPage(page?: string): string {
  if (page) return page;
  if (typeof location !== 'undefined' && location.pathname) return location.pathname;
  return 'app';
}

/**
 * Forward `console.error` / `console.warn` (and, in browsers, uncaught `error` +
 * `unhandledrejection`) to the given logger so UI runtime errors land in SignOz.
 * Works in React, Astro and React Native. The original console output is kept,
 * and a failure to forward never breaks logging. Call once at app startup.
 *
 *   import { configureLogs, httpTransport, captureConsole, logs } from '@duncit/logs';
 *   configureLogs(httpTransport('https://server.duncit.com/logs'));
 *   captureConsole(logs.mWeb);            // or logs.portal.crm, logs.website.duncit, ...
 */
export function captureConsole(target: LevelFns, options: CaptureOptions = {}): void {
  const levels = options.levels ?? ['error', 'warn'];
  for (const level of levels) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try {
        original(...args);
      } catch {
        /* keep going */
      }
      try {
        target[level](currentPage(options.page), 'console', { message: argMessage(args) });
      } catch {
        /* logging must never throw */
      }
    };
  }

  if ((options.windowErrors ?? true) && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('error', (event: ErrorEvent) => {
      try {
        target.error(currentPage(options.page), 'window.onerror', {
          message: event.message,
          source: event.filename,
          line: event.lineno,
          col: event.colno,
        });
      } catch {
        /* ignore */
      }
    });
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      try {
        target.error(currentPage(options.page), 'unhandledrejection', { reason: safeJson(event.reason) });
      } catch {
        /* ignore */
      }
    });
  }
}
