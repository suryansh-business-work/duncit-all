export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Where the log came from — drives the SignOz `environment` filter. */
export type Environment = 'localhost' | 'staging' | 'production';

/** Runtime the log was emitted from — drives the SignOz `platform` filter. */
export type Platform = 'web' | 'native' | 'server';

/** A thrown value flattened to primitives so SignOz shows the full error. */
export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

/** The structured payload every transport receives. Every field below is sent to
 * SignOz as a filterable attribute (see server observability/log.ts). */
export interface LogRecord {
  /** 'server' | 'mWeb' | 'mobileApp' | 'portal' | 'website' */
  app: string;
  /** Set when app === 'portal' | 'website' (e.g. 'crm', 'duncit'). */
  portal?: string;
  /** web | native | server. */
  platform: Platform;
  /** localhost | staging | production. */
  environment: Environment;
  /** Full URL the event happened on (browser href / server request url). */
  url?: string;
  /** Hostname only, for quick grouping (e.g. staging.crm.duncit.com). */
  host?: string;
  level: LogLevel;
  page: string;
  component: string;
  /** ISO-8601 capture time. */
  timestamp: string;
  /** The complete thrown error, flattened (name + message + stack). */
  error?: SerializedError;
  /** Arbitrary structured context — everything except `error`/`err`. */
  data?: Record<string, unknown>;
}

export type Transport = (record: LogRecord) => void;

/**
 * The per-call detail bag. Pass the thrown value under `error` (or `err`) and it
 * is serialized into `record.error`; everything else becomes `record.data`.
 *   log.error('/checkout', 'PaymentForm', { error: e, orderId });
 */
export type LogDetail = Record<string, unknown> & { error?: unknown; err?: unknown };

export interface LevelFns {
  debug: (page: string, component: string, detail?: LogDetail) => void;
  info: (page: string, component: string, detail?: LogDetail) => void;
  warn: (page: string, component: string, detail?: LogDetail) => void;
  error: (page: string, component: string, detail?: LogDetail) => void;
}
