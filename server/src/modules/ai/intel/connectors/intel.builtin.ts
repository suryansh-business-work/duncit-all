import mongoose from 'mongoose';
import { getStatusEnvironment } from '@observability/statusServices';
import type { IntelConnectorKind, IntelEnvironment } from '../intel.constants';
import type { EntryOption, ResolvedEntry } from './intel.credentials';

/**
 * Sources Intel reaches without a Tech portal entry, because they are this
 * server's own: its database (the MONGO_URI the deploy gives it — the one Tech ›
 * Database › Info shows) and its own MCP service, run in-process as the person
 * asking, so no token or consent screen is involved. Each is one environment:
 * the environment this server runs. A connector points at one with a reserved
 * `env_entry_id` instead of an entry id.
 *
 * Gmail connectors made by "Connect with Google" point at a connected account
 * (config.account_id) the same way.
 */

export const SERVER_DATABASE_ENTRY = 'server';
export const DUNCIT_MCP_ENTRY = 'duncit';
export const GMAIL_OAUTH_ENTRY = 'oauth';

/** The environment whose data this server holds. A local server counts as staging. */
export function serverEnvironment(): IntelEnvironment {
  return process.env.NODE_ENV === 'production' && getStatusEnvironment() === 'production' ? 'PRODUCTION' : 'STAGING';
}

const BUILTIN: Partial<Record<IntelConnectorKind, { id: string; name: string; description: string }>> = {
  MONGODB: { id: SERVER_DATABASE_ENTRY, name: 'Duncit database', description: 'This server’s own database, from the Tech portal (Database › Info).' },
  MCP: { id: DUNCIT_MCP_ENTRY, name: 'Duncit MCP', description: 'This server’s MCP tools, run as each person with their own permissions. No token needed.' },
};

/** The reserved id a kind's built-in source uses, or null when the kind has none. */
export const builtinEntryId = (kind: IntelConnectorKind): string | null => BUILTIN[kind]?.id ?? null;

export const isBuiltinEntry = (kind: IntelConnectorKind, entryId: string): boolean => builtinEntryId(kind) === entryId;

/** The built-in source as the first, default option of a connector form's credentials select. */
export function builtinEntryOption(kind: IntelConnectorKind): EntryOption | null {
  const builtin = BUILTIN[kind];
  if (!builtin) return null;
  if (kind === 'MONGODB' && !process.env.MONGO_URI?.trim()) return null;
  return { id: builtin.id, name: builtin.name, description: builtin.description, is_default: true, last_test_ok: null, environment: serverEnvironment(), builtin: true };
}

/** This server's database as an entry: its own connection string and database name. */
export function serverDatabaseEntry(): ResolvedEntry | null {
  const uri = process.env.MONGO_URI?.trim() ?? '';
  if (!uri) return null;
  return { id: SERVER_DATABASE_ENTRY, name: 'Duncit database', config: { uri, database: mongoose.connection.db?.databaseName ?? '' } };
}
