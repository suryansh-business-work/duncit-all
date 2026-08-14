import type { BugRow, BugStatus } from './queries';

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

  const bugs: BugExportEntry[] = [];
  for (const raw of parsed.bugs) {
    if (
      !isRecord(raw) ||
      typeof raw.fingerprint !== 'string' ||
      raw.fingerprint.trim() === '' ||
      typeof raw.title !== 'string' ||
      typeof raw.page !== 'string' ||
      typeof raw.source !== 'string'
    ) {
      return {
        error:
          'One of the bugs is missing its fingerprint, title, page or source, so nothing was imported.',
      };
    }
    const env = isRecord(raw.env_counts) ? raw.env_counts : {};
    bugs.push({
      fingerprint: raw.fingerprint,
      title: raw.title,
      error_name: asString(raw.error_name) ?? 'Error',
      message: asString(raw.message) ?? '',
      page: raw.page,
      source: raw.source,
      app: asString(raw.app) ?? raw.source.split(':')[0],
      portal: asString(raw.portal),
      platform: asString(raw.platform) ?? 'unknown',
      os: asString(raw.os),
      occurrence_count: typeof raw.occurrence_count === 'number' ? raw.occurrence_count : 1,
      first_seen_at: asString(raw.first_seen_at) ?? '',
      last_seen_at: asString(raw.last_seen_at) ?? '',
      env_counts: {
        localhost: typeof env.localhost === 'number' ? env.localhost : 0,
        staging: typeof env.staging === 'number' ? env.staging : 0,
        production: typeof env.production === 'number' ? env.production : 0,
      },
      last_url: asString(raw.last_url),
      last_host: asString(raw.last_host),
      last_stack: asString(raw.last_stack),
      status: raw.status === 'RESOLVED' || raw.status === 'IGNORED' ? raw.status : 'OPEN',
    });
  }

  if (bugs.length === 0) return { error: 'That file has no bugs in it.' };
  return { bugs };
}
