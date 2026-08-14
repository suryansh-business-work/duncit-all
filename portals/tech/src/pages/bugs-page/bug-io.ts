import type { BugRow, BugStatus, BugUser } from './queries';

/**
 * Reading and writing the bugs backup file.
 *
 * The file is plain JSON keyed on each bug's fingerprint — the stable identity
 * the server dedupes on — so a file can travel between environments (or survive
 * a wiped database) and land back on the same rows. Everything here is pure:
 * the portal only adds the file picker and the download.
 */

/** Bumped only if the shape changes in a way an older file cannot satisfy. */
export const BUG_EXPORT_VERSION = 1;

export interface BugExportEntry {
  fingerprint: string;
  title: string;
  error_name: string;
  message: string;
  page: string;
  source: string;
  app: string;
  portal: string | null;
  platform: string;
  os: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  env_counts: { localhost: number; staging: number; production: number };
  last_url: string | null;
  last_host: string | null;
  last_stack: string | null;
  last_user: BugUser | null;
  last_environment: string | null;
  last_app_version: string | null;
  last_user_agent: string | null;
  last_duid: string | null;
  last_session_id: string | null;
  affected_user_count: number;
  affected_user_ids: string[];
  anonymous_count: number;
  status: BugStatus;
}

export interface BugExportFile {
  duncit_bugs_export: number;
  exported_at: string;
  bugs: BugExportEntry[];
}

/**
 * Bugs as a file. Ids are deliberately left out: they belong to the database
 * they came from, and a bug is matched on fingerprint when it lands.
 */
export function buildBugExport(bugs: BugRow[], exportedAt: string): BugExportFile {
  return {
    duncit_bugs_export: BUG_EXPORT_VERSION,
    exported_at: exportedAt,
    bugs: bugs.map((bug) => ({
      fingerprint: bug.fingerprint,
      title: bug.title,
      error_name: bug.error_name,
      message: bug.message,
      page: bug.page,
      source: bug.source,
      app: bug.app,
      portal: bug.portal,
      platform: bug.platform,
      os: bug.os,
      occurrence_count: bug.occurrence_count,
      first_seen_at: bug.first_seen_at,
      last_seen_at: bug.last_seen_at,
      env_counts: {
        localhost: bug.env_counts.localhost,
        staging: bug.env_counts.staging,
        production: bug.env_counts.production,
      },
      last_url: bug.last_url,
      last_host: bug.last_host,
      last_stack: bug.last_stack,
      // Field by field like everything else here: the row came off Apollo, and
      // a passthrough would write `__typename` into the file.
      last_user: bug.last_user
        ? {
            id: bug.last_user.id,
            name: bug.last_user.name,
            email: bug.last_user.email,
            phone: bug.last_user.phone,
            roles: bug.last_user.roles,
          }
        : null,
      last_environment: bug.last_environment,
      last_app_version: bug.last_app_version,
      last_user_agent: bug.last_user_agent,
      last_duid: bug.last_duid,
      last_session_id: bug.last_session_id,
      affected_user_count: bug.affected_user_count,
      affected_user_ids: bug.affected_user_ids,
      anonymous_count: bug.anonymous_count,
      status: bug.status,
    })),
  };
}

/** `duncit-bugs-2026-08-14.json` — what it is and the day it was taken. */
export const bugExportFilename = (exportedAt: string): string =>
  `duncit-bugs-${exportedAt.slice(0, 10)}.json`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const asCount = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** The identity fields the server cannot invent. Everything else it defaults. */
function hasIdentity(raw: unknown): raw is Record<string, unknown> {
  return (
    isRecord(raw) &&
    typeof raw.fingerprint === 'string' &&
    raw.fingerprint.trim() !== '' &&
    typeof raw.title === 'string' &&
    typeof raw.page === 'string' &&
    typeof raw.source === 'string'
  );
}

/** The account a file row named, or null when it named nobody usable. */
function asUser(value: unknown): BugUser | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id === '') return null;
  const roles = Array.isArray(value.roles)
    ? value.roles.filter((r): r is string => typeof r === 'string')
    : [];
  return {
    id: value.id,
    name: asString(value.name),
    email: asString(value.email),
    phone: asString(value.phone),
    roles,
  };
}

/** One validated file row as the entry the mutation takes. */
function toBugEntry(raw: Record<string, unknown>): BugExportEntry {
  const env = isRecord(raw.env_counts) ? raw.env_counts : {};
  const source = String(raw.source);
  return {
    fingerprint: String(raw.fingerprint),
    title: String(raw.title),
    error_name: asString(raw.error_name) ?? 'Error',
    message: asString(raw.message) ?? '',
    page: String(raw.page),
    source,
    app: asString(raw.app) ?? source.split(':')[0],
    portal: asString(raw.portal),
    platform: asString(raw.platform) ?? 'unknown',
    os: asString(raw.os),
    occurrence_count: asCount(raw.occurrence_count, 1),
    first_seen_at: asString(raw.first_seen_at) ?? '',
    last_seen_at: asString(raw.last_seen_at) ?? '',
    env_counts: {
      localhost: asCount(env.localhost),
      staging: asCount(env.staging),
      production: asCount(env.production),
    },
    last_url: asString(raw.last_url),
    last_host: asString(raw.last_host),
    last_stack: asString(raw.last_stack),
    last_user: asUser(raw.last_user),
    last_environment: asString(raw.last_environment),
    last_app_version: asString(raw.last_app_version),
    last_user_agent: asString(raw.last_user_agent),
    last_duid: asString(raw.last_duid),
    last_session_id: asString(raw.last_session_id),
    affected_user_count: asCount(raw.affected_user_count),
    affected_user_ids: Array.isArray(raw.affected_user_ids)
      ? raw.affected_user_ids.filter((id): id is string => typeof id === 'string')
      : [],
    anonymous_count: asCount(raw.anonymous_count),
    status: raw.status === 'RESOLVED' || raw.status === 'IGNORED' ? raw.status : 'OPEN',
  };
}

/**
 * A file the operator picked, turned into entries to send — or a reason it
 * cannot be. Anything unreadable is rejected whole rather than half-applied.
 * Only identity fields are demanded; the server defaults the rest, so a
 * hand-trimmed file still imports.
 */
export function parseBugImport(text: string): { bugs: BugExportEntry[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.bugs)) {
    return { error: 'That file is not a bugs export — it has no "bugs" list.' };
  }
  if (!parsed.bugs.every(hasIdentity)) {
    return {
      error:
        'One of the bugs is missing its fingerprint, title, page or source, so nothing was imported.',
    };
  }

  const bugs = parsed.bugs.map(toBugEntry);
  if (bugs.length === 0) return { error: 'That file has no bugs in it.' };
  return { bugs };
}
