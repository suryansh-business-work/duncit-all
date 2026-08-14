import type { TelemetryLevel, TelemetryLogRow } from './queries';

/**
 * Reading and writing the log backup file.
 *
 * Rows keep the id they were stored under, which is what makes an import
 * idempotent: the same file loaded twice adds nothing the second time, and a
 * file can be replayed into a rebuilt database without doubling its history.
 * Everything here is pure — the page only adds the picker and the download.
 */

/** Bumped only if the shape changes in a way an older file cannot satisfy. */
export const LOG_EXPORT_VERSION = 1;

/** What a row looks like on the way out and back in — the same shape both ways. */
export type LogExportEntry = Omit<TelemetryLogRow, 'user_id'>;

export interface LogExportFile {
  duncit_logs_export: number;
  level: string;
  exported_at: string;
  logs: LogExportEntry[];
}

/**
 * Logs as a file.
 *
 * Built field by field rather than spread, for two reasons. `user_id` is a
 * denormalized copy of `user.id`, and a file carrying both is a file that can
 * disagree with itself — the server rebuilds it on the way in. And the rows
 * come off Apollo, so a spread would write `__typename` into every object in
 * the download: a key the declared `LogExportEntry` shape does not have, in a
 * file an operator reads by eye and scripts parse.
 */
export function buildLogExport(
  rows: TelemetryLogRow[],
  level: TelemetryLevel,
  exportedAt: string,
): LogExportFile {
  return {
    duncit_logs_export: LOG_EXPORT_VERSION,
    level,
    exported_at: exportedAt,
    logs: rows.map((row) => ({
      id: row.id,
      app: row.app,
      portal: row.portal,
      platform: row.platform,
      os: row.os,
      environment: row.environment,
      source: row.source,
      level: row.level,
      page: row.page,
      component: row.component,
      url: row.url,
      host: row.host,
      error: row.error
        ? { name: row.error.name, message: row.error.message, stack: row.error.stack }
        : null,
      data_json: row.data_json,
      user: exportUser(row.user),
      client: exportClient(row.client),
      duid: row.duid,
      session_id: row.session_id,
      ip: row.ip,
      user_agent: row.user_agent,
      created_at: row.created_at,
    })),
  };
}

/** The account, rebuilt without whatever else Apollo attached to it. */
function exportUser(user: TelemetryLogRow['user']): LogExportEntry['user'] {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    roles: user.roles,
  };
}

function exportClient(client: TelemetryLogRow['client']): LogExportEntry['client'] {
  if (!client) return null;
  return {
    app_version: client.app_version,
    device_model: client.device_model,
    device_os_version: client.device_os_version,
    locale: client.locale,
    timezone: client.timezone,
    screen: client.screen,
    viewport: client.viewport,
    network: client.network,
    referrer: client.referrer,
  };
}

/** `duncit-logs-error-2026-08-14.json` — what it is and the day it was taken. */
export const logExportFilename = (level: string, exportedAt: string): string =>
  `duncit-logs-${level}-${exportedAt.slice(0, 10)}.json`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A field the server declares non-null: present, a string, and not blank. */
const filled = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** A field is carried only when it arrived as a string; everything else is dropped. */
const pickStrings = <K extends string>(
  raw: Record<string, unknown> | undefined,
  keys: readonly K[],
): Partial<Record<K, string>> => {
  const out: Partial<Record<K, string>> = {};
  for (const key of keys) {
    const value = raw?.[key];
    if (typeof value === 'string' && value !== '') out[key] = value;
  }
  return out;
};

const CLIENT_KEYS = [
  'app_version',
  'device_model',
  'device_os_version',
  'locale',
  'timezone',
  'screen',
  'viewport',
  'network',
  'referrer',
] as const;

const ROW_KEYS = [
  'id',
  'app',
  'portal',
  'platform',
  'os',
  'environment',
  'source',
  'level',
  'page',
  'component',
  'url',
  'host',
  'data_json',
  'duid',
  'session_id',
  'ip',
  'user_agent',
  'created_at',
] as const;

const USER_KEYS = ['id', 'name', 'email', 'phone'] as const;

/** The entry the mutation takes, rebuilt field by field from one file row. */
function toEntry(raw: Record<string, unknown>): Record<string, unknown> {
  const rawUser = isRecord(raw.user) ? raw.user : undefined;
  const rawError = isRecord(raw.error) ? raw.error : undefined;
  const roles = Array.isArray(rawUser?.roles)
    ? rawUser.roles.filter((r): r is string => typeof r === 'string')
    : undefined;
  return {
    ...pickStrings(raw, ROW_KEYS),
    error: rawError?.message ? pickStrings(rawError, ['name', 'message', 'stack']) : undefined,
    user: rawUser?.id ? { ...pickStrings(rawUser, USER_KEYS), roles } : undefined,
    client: isRecord(raw.client) ? pickStrings(raw.client, CLIENT_KEYS) : undefined,
  };
}

/**
 * A file the operator picked, turned into entries to send — or a reason it
 * cannot be. Anything unreadable is rejected whole rather than half-applied.
 * Only the fields the server cannot invent are demanded; it defaults the rest,
 * so a hand-trimmed file still imports.
 */
export function parseLogImport(
  text: string,
): { logs: Record<string, unknown>[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.logs)) {
    return { error: 'That file is not a logs export — it has no "logs" list.' };
  }
  // A file from a newer build may carry a shape this one cannot read. Saying so
  // beats importing half of it and leaving the rest silently behind.
  const version = parsed.duncit_logs_export;
  if (typeof version === 'number' && version > LOG_EXPORT_VERSION) {
    return { error: `That file was written by a newer version (${version}) of this page.` };
  }

  const logs: Record<string, unknown>[] = [];
  for (const raw of parsed.logs) {
    // Blank is not the same as present: `app: ""` passes a typeof check and
    // then gets dropped on the way to a non-null GraphQL input, which fails
    // the whole mutation with a schema error rather than this message.
    if (
      !isRecord(raw) ||
      !filled(raw.app) ||
      !filled(raw.level) ||
      !filled(raw.page) ||
      !filled(raw.component)
    ) {
      return {
        error:
          'One of the logs is missing its app, level, page or component, so nothing was imported.',
      };
    }
    logs.push(toEntry(raw));
  }

  if (logs.length === 0) return { error: 'That file has no logs in it.' };
  return { logs };
}
