import { Types } from 'mongoose';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';

/**
 * Connector credentials come from the Tech portal, never from Intel. A connector
 * stores only the id of one named Tech portal entry; this module reads that
 * entry on the server when a connector runs. Secrets never leave this file's
 * callers — the GraphQL layer only ever sees entry names (`entryOptions`).
 */

export type EntryConfig = Record<string, string>;

export interface ResolvedEntry {
  id: string;
  name: string;
  config: EntryConfig;
}

const asConfig = (raw: unknown): EntryConfig => {
  const out: EntryConfig = {};
  for (const [key, value] of Object.entries((raw as Record<string, unknown> | null) ?? {})) {
    if (value !== null && value !== undefined) out[key] = String(value).trim();
  }
  return out;
};

/** The active entry `id` in `category`, or null when it is missing, inactive or of another category. */
export async function resolveEntry(category: string, id: string | null | undefined): Promise<ResolvedEntry | null> {
  if (!id || !Types.ObjectId.isValid(id)) return null;
  const entry = await EnvEntryModel.findOne({ _id: id, category, is_active: true }).lean();
  if (!entry) return null;
  return { id: String(entry._id), name: entry.name, config: asConfig(entry.config) };
}

/** The category's active default entry — the fallback when a setting names none. */
export async function resolveDefaultEntry(category: string): Promise<ResolvedEntry | null> {
  const entry = await EnvEntryModel.findOne({ category, is_active: true, is_default: true }).lean();
  return entry ? { id: String(entry._id), name: entry.name, config: asConfig(entry.config) } : null;
}

export interface EntryOption {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  last_test_ok: boolean | null;
}

/** The names a connector form offers in its select — never a value from `config`. */
export async function entryOptions(category: string): Promise<EntryOption[]> {
  const rows = await EnvEntryModel.find({ category, is_active: true }).sort({ is_default: -1, name: 1 }).lean();
  return rows.map((r) => ({
    id: String(r._id),
    name: r.name,
    description: r.description ?? '',
    is_default: Boolean(r.is_default),
    last_test_ok: r.last_test_ok ?? null,
  }));
}
