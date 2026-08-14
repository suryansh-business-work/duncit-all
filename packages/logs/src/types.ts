export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Where the log came from — drives the SignOz `environment` filter. */
export type Environment = 'localhost' | 'staging' | 'production';

/** Runtime the log was emitted from — drives the SignOz `platform` filter. */
export type Platform = 'web' | 'native' | 'server';

/** Native device OS — splits `platform:'native'` into iOS / Android / native-web.
 * Unset for pure web (mWeb/portals/websites) and server logs. */
export type DeviceOS = 'ios' | 'android' | 'web';

/** A thrown value flattened to primitives so SignOz shows the full error. */
export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

/**
 * What the surface knows about the machine it is running on — the context that
 * turns "it crashed" into "it crashes on this build, on this locale, offline".
 * Every field is optional: a surface reports what it can see.
 */
export interface LogClient {
  /** The shipped app/build version (expo.version, the portal's package version). */
  app_version?: string;
  /** Native device model + OS version; unset on web. */
  device_model?: string;
  device_os_version?: string;
  /** BCP-47 language tag and IANA zone the surface is rendering in. */
  locale?: string;
  timezone?: string;
  /** `1920x1080` — the screen, and the part of it this surface occupies. */
  screen?: string;
  viewport?: string;
  /** `4g` / `wifi` / `offline` — what the connection looked like at the time. */
  network?: string;
  /** Where the visitor arrived from (browser referrer). */
  referrer?: string;
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
  /** Native device OS (ios | android | web); unset for web/server. */
  os?: DeviceOS;
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
  /**
   * Build + machine facts, resolved fresh on every emit.
   *
   * There is deliberately no `user` here. Identity is stamped by the SERVER
   * from the token this record is POSTed with: a page can claim to be anyone,
   * and a bug filed against the wrong person is worse than one filed against
   * nobody. See server/src/observability/requestIdentity.ts.
   */
  client?: LogClient;
  /** Duncit device id — the same value the API is called with (`x-duid`). */
  duid?: string;
  /** One id per tab / app launch, so a single run reads as one thread. */
  session_id?: string;
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
