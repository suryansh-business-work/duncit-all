import { z } from 'zod';
import type { IntelConnector } from '@duncit/gql-types';
import { GIT_BRANCH, GITHUB_NAME, MONGO_COLLECTION, MONGO_DATABASE } from '@duncit/regex';
import { intField, type Translate } from '../../fields';

/**
 * A connector: a name, the environment its data belongs to, the Tech portal
 * entry its credentials come from, and kind-specific options. The server
 * validates the same shape (intelConnector.schema).
 */

export const ACCESS_MODES = ['READ_ONLY', 'WRITE_ONLY', 'READ_WRITE'] as const;

const mongo = (t: Translate) =>
  z.object({
    database: z.string().trim().refine((v) => v === '' || MONGO_DATABASE.test(v), t('intel.settings.connectors.databaseInvalid')),
    collections: z.array(z.string().trim().regex(MONGO_COLLECTION, t('intel.settings.connectors.collectionInvalid'))).max(300),
    access_mode: z.enum(ACCESS_MODES),
  });

const slack = (t: Translate) =>
  z.object({
    channels: z.array(z.object({ id: z.string(), name: z.string() })).max(200),
    include_threads: z.boolean(),
    index_attachments: z.boolean(),
    history_days: intField(t, 1, 3650),
  });

const gmail = (t: Translate) =>
  z.object({
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

export const makeConnectorSchema = (t: Translate, kind: ConnectorKind) =>
  z
    .object({
      name: z.string().trim().min(2, t('intel.settings.connectors.nameRequired')).max(80, t('intel.settings.common.max', { vars: { max: 80 } })),
      environment: z.enum(['STAGING', 'PRODUCTION', 'BOTH']),
      env_entry_id: z.string().min(1, t('intel.settings.connectors.entryRequired')),
      enabled: z.boolean(),
      config: CONFIG[kind](t) as z.ZodType<ConnectorConfigValues>,
    })
    .refine((v) => kind !== 'MONGODB' || v.environment !== 'BOTH', { message: t('intel.settings.connectors.mongoOneEnv'), path: ['environment'] });

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
  channels?: Array<{ id: string; name: string }>;
  include_threads?: boolean;
  index_attachments?: boolean;
  history_days?: number;
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
  MONGODB: { database: '', collections: [], access_mode: 'READ_ONLY' },
  SLACK: { channels: [], include_threads: true, index_attachments: false, history_days: 90 },
  GMAIL: { query: 'in:inbox', max_threads: 500, include_attachments: false, history_days: 90 },
  GITHUB: { repos: [{ owner: '', repo: '', branch: 'main', code: true, docs: true, issues: true, prs: true, commits: true }] },
  MCP: {},
};

/** The form's starting values: a saved connector, or a new one of `kind`. */
export function toConnectorValues(kind: ConnectorKind, connector: IntelConnector | null): ConnectorValues {
  if (!connector) return { name: '', environment: kind === 'MONGODB' ? 'STAGING' : 'BOTH', env_entry_id: '', enabled: true, config: EMPTY_CONFIG[kind] };
  let config: ConnectorConfigValues = EMPTY_CONFIG[kind];
  try {
    config = { ...EMPTY_CONFIG[kind], ...(JSON.parse(connector.config) as ConnectorConfigValues) };
  } catch {
    config = EMPTY_CONFIG[kind];
  }
  return { name: connector.name, environment: connector.environment, env_entry_id: connector.env_entry_id, enabled: connector.enabled, config };
}
