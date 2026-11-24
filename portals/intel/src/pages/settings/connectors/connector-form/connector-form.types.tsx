import { z } from 'zod';
import type { IntelConnector, IntelEntryOption } from '@duncit/gql-types';
import { DB_HOST, GIT_BRANCH, GITHUB_NAME, MONGO_COLLECTION, MONGO_DATABASE, MONGO_URI } from '@duncit/regex';
import { intField, type Translate } from '../../fields';

/**
 * A connector: a name, the environment its data belongs to, where its
 * credentials come from, and kind-specific options. The server validates the
 * same shape (intelConnector.schema / mongo.newConnection).
 *
 * Credentials: a Tech portal entry; this server's own database or MCP (a
 * built-in option, environment fixed by the server); a Gmail account
 * connected with Google; or — for a database — a new Atlas or self-deployed
 * connection typed here (`NEW_ATLAS` / `NEW_SELF_HOSTED`), which the server
 * tries and saves as a Tech portal entry.
 */

export const ACCESS_MODES = ['READ_ONLY', 'WRITE_ONLY', 'READ_WRITE'] as const;
/** Select values for "add a new database connection" — never a real entry id (those are 24 hex characters). */
export const NEW_ATLAS = 'new:atlas';
export const NEW_SELF_HOSTED = 'new:self';
export const isNewConnection = (entryId: string) => entryId === NEW_ATLAS || entryId === NEW_SELF_HOSTED;
/** The reserved id of a Gmail connector made by Connect with Google. */
export const GMAIL_OAUTH_ENTRY = 'oauth';

export interface NewConnectionValues {
  uri: string;
  host: string;
  port: number;
  username: string;
  password: string;
  auth_source: string;
  tls: boolean;
}

export const EMPTY_NEW_CONNECTION: NewConnectionValues = { uri: '', host: '', port: 27017, username: '', password: '', auth_source: 'admin', tls: false };

const mongo = (t: Translate) =>
  z.object({
    database: z.string().trim().refine((v) => v === '' || MONGO_DATABASE.test(v), t('intel.settings.connectors.databaseInvalid')),
    collections: z.array(z.string().trim().regex(MONGO_COLLECTION, t('intel.settings.connectors.collectionInvalid'))).max(300),
    access_mode: z.enum(ACCESS_MODES),
    new_connection: z.object({ uri: z.string(), host: z.string(), port: z.union([z.number(), z.string()]), username: z.string(), password: z.string(), auth_source: z.string(), tls: z.boolean() }).optional(),
  });

const slack = (t: Translate) =>
  z.object({
    channels: z.array(z.object({ id: z.string(), name: z.string() })).max(1000),
    include_threads: z.boolean(),
    index_attachments: z.boolean(),
    history_days: intField(t, 1, 3650),
  });

const gmail = (t: Translate) =>
  z.object({
    account_id: z.string().optional(),
    query: z.string().trim().max(300, t('intel.settings.common.max', { vars: { max: 300 } })),
    max_threads: intField(t, 10, 5000),
    include_attachments: z.boolean(),
    history_days: intField(t, 1, 3650),
  });

const github = (t: Translate) =>
  z.object({
    repos: z
      .array(
        z.object({
          owner: z.string().trim().regex(GITHUB_NAME, t('intel.settings.connectors.githubName')),
          repo: z.string().trim().regex(GITHUB_NAME, t('intel.settings.connectors.githubName')),
          branch: z.string().trim().regex(GIT_BRANCH, t('intel.settings.connectors.branchInvalid')),
          code: z.boolean(),
          docs: z.boolean(),
          issues: z.boolean(),
          prs: z.boolean(),
          commits: z.boolean(),
        })
      )
      .min(1, t('intel.settings.connectors.repoRequired'))
      .max(20),
  });

const CONFIG = { MONGODB: mongo, SLACK: slack, GMAIL: gmail, GITHUB: github, MCP: () => z.object({}) } as const;
export type ConnectorKind = keyof typeof CONFIG;

type Issue = { path: string[]; message: string };

/** What is wrong with a new database connection's fields (none for an existing entry). */
export function newConnectionIssues(t: Translate, entryId: string, conn: NewConnectionValues | undefined): Issue[] {
  const at = (field: string, message: string): Issue => ({ path: ['config', 'new_connection', field], message });
  if (entryId === NEW_ATLAS) return MONGO_URI.test(String(conn?.uri ?? '').trim()) ? [] : [at('uri', t('intel.settings.connectors.uriInvalid'))];
  if (entryId !== NEW_SELF_HOSTED) return [];
  const issues: Issue[] = [];
  const port = Number(conn?.port);
  if (!DB_HOST.test(String(conn?.host ?? '').trim())) issues.push(at('host', t('intel.settings.connectors.hostInvalid')));
  if (!Number.isInteger(port)) issues.push(at('port', t('intel.settings.common.integer')));
  else if (port < 1) issues.push(at('port', t('intel.settings.common.min', { vars: { min: 1 } })));
  else if (port > 65535) issues.push(at('port', t('intel.settings.common.max', { vars: { max: 65535 } })));
  if (!String(conn?.username ?? '').trim()) issues.push(at('username', t('intel.settings.connectors.usernameRequired')));
  if (!conn?.password) issues.push(at('password', t('intel.settings.connectors.passwordRequired')));
  if (!MONGO_DATABASE.test(String(conn?.auth_source ?? '').trim())) issues.push(at('auth_source', t('intel.settings.connectors.databaseInvalid')));
  return issues;
}

export const makeConnectorSchema = (t: Translate, kind: ConnectorKind) =>
  z
    .object({
      name: z.string().trim().min(2, t('intel.settings.connectors.nameRequired')).max(80, t('intel.settings.common.max', { vars: { max: 80 } })),
      environment: z.enum(['STAGING', 'PRODUCTION', 'BOTH']),
      env_entry_id: z.string().min(1, t('intel.settings.connectors.entryRequired')),
      enabled: z.boolean(),
      config: CONFIG[kind](t) as z.ZodType<ConnectorConfigValues>,
    })
    .refine((v) => kind !== 'MONGODB' || v.environment !== 'BOTH', { message: t('intel.settings.connectors.mongoOneEnv'), path: ['environment'] })
    .superRefine((v, ctx) => {
      if (kind !== 'MONGODB') return;
      for (const issue of newConnectionIssues(t, v.env_entry_id, v.config.new_connection)) ctx.addIssue({ code: 'custom', ...issue });
    });

export interface RepoValues {
  owner: string;
  repo: string;
  branch: string;
  code: boolean;
  docs: boolean;
  issues: boolean;
  prs: boolean;
  commits: boolean;
}

/** Every kind's options in one shape; each kind's form uses only its own fields. */
export interface ConnectorConfigValues {
  database?: string;
  collections?: string[];
  access_mode?: string;
  new_connection?: NewConnectionValues;
  channels?: Array<{ id: string; name: string }>;
  include_threads?: boolean;
  index_attachments?: boolean;
  history_days?: number;
  account_id?: string;
  query?: string;
  max_threads?: number;
  include_attachments?: boolean;
  repos?: RepoValues[];
}

export interface ConnectorValues {
  name: string;
  environment: string;
  env_entry_id: string;
  enabled: boolean;
  config: ConnectorConfigValues;
}

export const EMPTY_CONFIG: Record<ConnectorKind, ConnectorConfigValues> = {
  MONGODB: { database: '', collections: [], access_mode: 'READ_ONLY', new_connection: EMPTY_NEW_CONNECTION },
  SLACK: { channels: [], include_threads: true, index_attachments: false, history_days: 90 },
  GMAIL: { query: 'in:inbox', max_threads: 500, include_attachments: false, history_days: 90 },
  GITHUB: { repos: [{ owner: '', repo: '', branch: 'main', code: true, docs: true, issues: true, prs: true, commits: true }] },
  MCP: {},
};

/** The form's starting values: a saved connector, or a new one of `kind` on the default credentials (the built-in source when there is one). */
export function toConnectorValues(kind: ConnectorKind, connector: IntelConnector | null, entries: readonly IntelEntryOption[] = []): ConnectorValues {
  if (!connector) {
    const preferred = entries.find((e) => e.is_default) ?? (entries.length === 1 ? entries[0] : undefined);
    const environment = preferred?.environment ?? (kind === 'MONGODB' ? 'STAGING' : 'BOTH');
    return { name: '', environment, env_entry_id: preferred?.id ?? '', enabled: true, config: EMPTY_CONFIG[kind] };
  }
  let config: ConnectorConfigValues = EMPTY_CONFIG[kind];
  try {
    config = { ...EMPTY_CONFIG[kind], ...(JSON.parse(connector.config) as ConnectorConfigValues) };
  } catch {
    config = EMPTY_CONFIG[kind];
  }
  return { name: connector.name, environment: connector.environment, env_entry_id: connector.env_entry_id, enabled: connector.enabled, config };
}

/** What is sent to the server: a new connection becomes `config.new_connection` with no entry id; otherwise it is left out. */
export function toConnectorInput(kind: ConnectorKind, values: ConnectorValues) {
  const { new_connection: conn, ...config } = values.config;
  if (kind !== 'MONGODB' || !isNewConnection(values.env_entry_id) || !conn) return { ...values, config };
  const newConnection =
    values.env_entry_id === NEW_ATLAS
      ? { type: 'ATLAS', uri: conn.uri.trim() }
      : { type: 'SELF_HOSTED', host: conn.host.trim(), port: Number(conn.port), username: conn.username.trim(), password: conn.password, auth_source: conn.auth_source.trim(), tls: conn.tls };
  return { ...values, env_entry_id: '', config: { ...config, new_connection: newConnection } };
}
