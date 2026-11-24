import { GraphQLError } from 'graphql';
import { validate } from '@utils/validate';
import { CONNECTOR_ENV_CATEGORY } from '../intel.constants';
import { IntelGmailAccountModel } from './gmail/gmailAccount.model';
import { builtinEntryOption, GMAIL_OAUTH_ENTRY, isBuiltinEntry, serverEnvironment } from './intel.builtin';
import { entryOptions, resolveEntry } from './intel.credentials';
import { CONFIG_SCHEMAS, connectorInputSchema } from './intelConnector.schema';
import type { IIntelConnector } from './intelConnector.model';
import { createMongoEntry } from './mongo/mongo.newConnection';

/**
 * A connector's input, validated, with where its credentials come from
 * settled: a Tech portal entry, this server's own database or MCP (the
 * environment is then this server's), a Gmail account connected with Google
 * (environment BOTH), or a new database connection the form describes —
 * saved as a Tech portal entry only once everything else has passed.
 */

export const invalidInput = (error: string) => new GraphQLError('Validation failed', { extensions: { code: 'BAD_USER_INPUT', errors: [error] } });

export async function parseConnectorInput(input: unknown) {
  const base = await validate(connectorInputSchema, input);
  const { new_connection: newConnection, ...rawConfig } = base.config;
  const config = await validate(CONFIG_SCHEMAS[base.kind], rawConfig);
  if (base.kind === 'MONGODB' && newConnection !== undefined) return { data: { ...base, config }, newConnection };
  if (isBuiltinEntry(base.kind, base.env_entry_id)) return { data: { ...base, environment: serverEnvironment(), config }, newConnection: undefined };
  const accountId = typeof config.account_id === 'string' ? config.account_id : '';
  if (base.kind === 'GMAIL' && accountId) {
    if (!(await IntelGmailAccountModel.exists({ _id: accountId }))) throw invalidInput('config.account_id: This Gmail account is no longer connected. Connect it again with Google.');
    return { data: { ...base, env_entry_id: GMAIL_OAUTH_ENTRY, environment: 'BOTH' as const, config }, newConnection: undefined };
  }
  if (!(await resolveEntry(CONNECTOR_ENV_CATEGORY[base.kind], base.env_entry_id))) throw invalidInput('env_entry_id: Choose an active Tech portal entry of the right kind');
  return { data: { ...base, config }, newConnection: undefined };
}

export type ParsedConnectorInput = Awaited<ReturnType<typeof parseConnectorInput>>;

/** The data to save; a new database connection is tried and stored as a Tech portal entry first. */
export async function settleConnectorEntry(parsed: ParsedConnectorInput) {
  if (parsed.newConnection === undefined) return parsed.data;
  const entryId = await createMongoEntry(parsed.newConnection, parsed.data.name, String(parsed.data.config.database ?? ''));
  return { ...parsed.data, env_entry_id: entryId };
}

const accountIdOf = (r: Pick<IIntelConnector, 'kind' | 'config'>): string | null => {
  const id = (r.config as { account_id?: unknown } | undefined)?.account_id;
  return r.kind === 'GMAIL' && typeof id === 'string' && id ? id : null;
};

const credentialKey = (r: Pick<IIntelConnector, 'kind' | 'config' | 'env_entry_id'>): string => {
  const accountId = accountIdOf(r);
  return accountId ? `account:${accountId}` : r.env_entry_id;
};

/** What each connector's credentials are called: an entry name, a built-in source, or a connected mailbox. */
export async function credentialNames(rows: Array<Pick<IIntelConnector, 'kind' | 'config' | 'env_entry_id'>>): Promise<(row: Pick<IIntelConnector, 'kind' | 'config' | 'env_entry_id'>) => string> {
  const kinds = [...new Set(rows.map((r) => r.kind))];
  const names = new Map((await Promise.all(kinds.map((k) => entryOptions(CONNECTOR_ENV_CATEGORY[k])))).flat().map((e) => [e.id, e.name]));
  for (const kind of kinds) {
    const builtin = builtinEntryOption(kind);
    if (builtin) names.set(builtin.id, builtin.name);
  }
  const accountIds = rows.map(accountIdOf).filter((id): id is string => id !== null);
  if (accountIds.length) {
    for (const a of await IntelGmailAccountModel.find({ _id: { $in: accountIds } }, { email: 1 }).lean()) names.set(`account:${String(a._id)}`, a.email);
  }
  return (row) => names.get(credentialKey(row)) ?? '';
}
