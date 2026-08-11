import type { FeatureFlagRow } from './queries';

/**
 * Reading and writing the feature-flags backup file.
 *
 * The file is plain JSON: it is what an operator carries when they want a
 * second environment switched on the same way as this one, and what they keep
 * before a run of risky toggling. Everything here is pure, so the shape can be
 * trusted without a browser: the page only adds the file picker and download.
 */

/** Bumped only if the shape changes in a way an older file cannot satisfy. */
export const FLAG_EXPORT_VERSION = 1;

export interface FlagExportEntry {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface FlagExportFile {
  duncit_flag_export: number;
  exported_at: string;
  flags: FlagExportEntry[];
}

/**
 * Flags as a file. Ids are deliberately left out: they belong to the server
 * they came from, and a flag is matched on its key when it lands. `is_system`
 * is left out too — the server seeds those keys itself on boot, so the file
 * only needs to say whether the feature is on.
 */
export function buildFlagExport(flags: FeatureFlagRow[], exportedAt: string): FlagExportFile {
  return {
    duncit_flag_export: FLAG_EXPORT_VERSION,
    exported_at: exportedAt,
    flags: flags.map((flag) => ({
      key: flag.key,
      name: flag.name,
      description: flag.description ?? '',
      enabled: flag.enabled,
    })),
  };
}

/** `duncit-feature-flags-2026-08-11.json` — the day it was taken. */
export const flagExportFilename = (exportedAt: string): string =>
  `duncit-feature-flags-${exportedAt.slice(0, 10)}.json`;

/** What the import mutation takes. */
export interface FlagImportEntry {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A file the operator picked, turned into flags to send — or a reason it
 * cannot be. Anything unreadable is rejected whole rather than half-applied:
 * a run of features half switched is worse than none.
 */
export function parseFlagImport(text: string): { flags: FlagImportEntry[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.flags)) {
    return { error: 'That file is not a feature-flags export — it has no "flags" list.' };
  }

  const flags: FlagImportEntry[] = [];
  for (const raw of parsed.flags) {
    if (!isRecord(raw) || typeof raw.key !== 'string' || typeof raw.name !== 'string') {
      return { error: 'One of the flags has no key or name, so nothing was imported.' };
    }
    flags.push({
      key: raw.key,
      name: raw.name,
      description: typeof raw.description === 'string' ? raw.description : '',
      enabled: raw.enabled === true,
    });
  }

  if (flags.length === 0) return { error: 'That file has no flags in it.' };
  return { flags };
}
