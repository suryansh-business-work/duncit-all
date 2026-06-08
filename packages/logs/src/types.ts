export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** The structured payload every transport receives. */
export interface LogRecord {
  /** 'server' | 'mWeb' | 'mobileApp' | 'portal' */
  app: string;
  /** Set when app === 'portal' (e.g. 'crm', 'finance'). */
  portal?: string;
  level: LogLevel;
  page: string;
  component: string;
  /** ISO-8601 capture time. */
  timestamp: string;
  /** Arbitrary structured context — the `<object>` passed to each call. */
  data?: Record<string, unknown>;
}

export type Transport = (record: LogRecord) => void;

export interface LevelFns {
  debug: (page: string, component: string, data?: Record<string, unknown>) => void;
  info: (page: string, component: string, data?: Record<string, unknown>) => void;
  warn: (page: string, component: string, data?: Record<string, unknown>) => void;
  error: (page: string, component: string, data?: Record<string, unknown>) => void;
}
