import type { EnvEntry } from './queries';

/**
 * Reading and writing the environment-variables backup file.
 *
 * The file is plain JSON with real keys and real values — it is what an
 * operator carries from one environment to another, and what they keep when a
 * server is rebuilt. Everything here is pure, so the shape can be trusted
 * without a browser: the portal only adds the file picker and the download.
 */

/** Bumped only if the shape changes in a way an older file cannot satisfy. */
export const ENV_EXPORT_VERSION = 1;

export interface EnvExportEntry {
  name: string;
  category: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  assigned_portals: string[];
  /** Real keys, real values — `{ "host": "smtp.example.com", "port": "587" }`. */
  config: Record<string, string>;
}

export interface EnvExportFile {
  duncit_env_export: number;
  exported_at: string;
  entries: EnvExportEntry[];
}

/**
 * Entries as a file. Ids are deliberately left out: they belong to the server
 * they came from, and an entry is matched on category + name when it lands.
 */
export function buildEnvExport(entries: EnvEntry[], exportedAt: string): EnvExportFile {
  return {
    duncit_env_export: ENV_EXPORT_VERSION,
    exported_at: exportedAt,
    entries: entries.map((entry) => ({
      name: entry.name,
      category: entry.category,
      description: entry.description ?? '',
      is_default: entry.is_default,
      is_active: entry.is_active,
      assigned_portals: entry.assigned_portals,
      config: Object.fromEntries(entry.config.map((pair) => [pair.key, pair.value])),
    })),
  };
}

/** `duncit-env-EMAIL-2026-08-11.json` — the scope and the day it was taken. */
export const envExportFilename = (scope: string, exportedAt: string): string =>
  `duncit-env-${scope}-${exportedAt.slice(0, 10)}.json`;

/** What the import mutation takes: config back as the key/value pairs the API speaks. */
export interface EnvImportEntry {
  name: string;
  category: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  assigned_portals: string[];
  config: Array<{ key: string; value: string }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * A config object back into pairs. Values are stringified because the API
 * takes strings and the server coerces them per field — a port written as the
 * number 587 in a hand-edited file must not be rejected for it.
 */
function toPairs(config: unknown): Array<{ key: string; value: string }> {
  if (!isRecord(config)) return [];
  const pairs: Array<{ key: string; value: string }> = [];
  for (const [key, value] of Object.entries(config)) {
    if (value === null || value === undefined) continue;
    pairs.push({ key, value: typeof value === 'object' ? JSON.stringify(value) : String(value) });
  }
  return pairs;
}

/**
 * A file the operator picked, turned into entries to send — or a reason it
 * cannot be. Anything unreadable is rejected whole rather than half-applied:
 * a partial credential restore is worse than none.
 */
export function parseEnvImport(text: string): { entries: EnvImportEntry[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.entries)) {
    return { error: 'That file is not an environment export — it has no "entries" list.' };
  }

  const entries: EnvImportEntry[] = [];
  for (const raw of parsed.entries) {
    if (!isRecord(raw) || typeof raw.name !== 'string' || typeof raw.category !== 'string') {
      return { error: 'One of the entries has no name or category, so nothing was imported.' };
    }
    entries.push({
      name: raw.name,
      category: raw.category,
      description: typeof raw.description === 'string' ? raw.description : '',
      is_default: raw.is_default === true,
      is_active: raw.is_active !== false,
      assigned_portals: asStringList(raw.assigned_portals),
      config: toPairs(raw.config),
    });
  }

  if (entries.length === 0) return { error: 'That file has no entries in it.' };
  return { entries };
}
