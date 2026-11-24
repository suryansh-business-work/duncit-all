import { CONNECTOR_ENV_CATEGORY } from '../intel.constants';
import { gmailAccountEntry } from './gmail/gmailAccount.entry';
import { DUNCIT_MCP_ENTRY, serverDatabaseEntry, SERVER_DATABASE_ENTRY } from './intel.builtin';
import { resolveEntry, type ResolvedEntry } from './intel.credentials';
import type { IIntelConnector } from './intelConnector.model';

/**
 * The credentials one connector runs with, wherever they live: this server's
 * own database, the in-process Duncit MCP, a Gmail account connected with
 * Google, or (everything else) the Tech portal entry it names. Null when that
 * source is gone — the caller reports it.
 */
export async function connectorEntry(c: Pick<IIntelConnector, 'kind' | 'env_entry_id' | 'config'>): Promise<ResolvedEntry | null> {
  if (c.kind === 'MONGODB' && c.env_entry_id === SERVER_DATABASE_ENTRY) return serverDatabaseEntry();
  if (c.kind === 'MCP' && c.env_entry_id === DUNCIT_MCP_ENTRY) return { id: DUNCIT_MCP_ENTRY, name: 'Duncit MCP', config: {} };
  const accountId = (c.config as { account_id?: unknown } | undefined)?.account_id;
  if (c.kind === 'GMAIL' && typeof accountId === 'string' && accountId) return gmailAccountEntry(accountId);
  return resolveEntry(CONNECTOR_ENV_CATEGORY[c.kind], c.env_entry_id);
}

/** Whether a connector runs this server's in-process MCP (no remote session, no token). */
export const isDuncitMcp = (c: Pick<IIntelConnector, 'kind' | 'env_entry_id'>): boolean => c.kind === 'MCP' && c.env_entry_id === DUNCIT_MCP_ENTRY;
