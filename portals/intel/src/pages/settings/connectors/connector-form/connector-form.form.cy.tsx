import { describe, expect, it } from 'vitest';
import type { IntelConnector } from '@duncit/gql-types';
import { EMPTY_CONFIG, isNewConnection, makeConnectorSchema, NEW_ATLAS, NEW_SELF_HOSTED, newConnectionIssues, toConnectorInput, toConnectorValues } from './connector-form.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key);
const base = { name: 'Staging DB', environment: 'STAGING', env_entry_id: '65a1b2c3d4e5f6a7b8c9d0e1', enabled: true };
const issues = (kind: Parameters<typeof makeConnectorSchema>[1], values: Record<string, unknown>) => {
  const result = makeConnectorSchema(t, kind).safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('connector form validation', () => {
  it('accepts a read-only MongoDB connection on permitted collections', () => {
    expect(issues('MONGODB', { ...base, config: { database: 'duncit', collections: ['pods', 'clubs'], access_mode: 'READ_ONLY' } })).toEqual([]);
  });

  it('refuses a MongoDB connection for both environments, system collections and a missing entry', () => {
    expect(issues('MONGODB', { ...base, environment: 'BOTH', config: EMPTY_CONFIG.MONGODB })).toEqual(['environment: intel.settings.connectors.mongoOneEnv']);
    expect(issues('MONGODB', { ...base, config: { ...EMPTY_CONFIG.MONGODB, collections: ['system.users'] } })).toEqual(['config.collections.0: intel.settings.connectors.collectionInvalid']);
    expect(issues('MONGODB', { ...base, env_entry_id: '', config: EMPTY_CONFIG.MONGODB })).toEqual(['env_entry_id: intel.settings.connectors.entryRequired']);
  });

  it('lets non-database sources cover both environments', () => {
    expect(issues('SLACK', { ...base, environment: 'BOTH', config: EMPTY_CONFIG.SLACK })).toEqual([]);
    expect(issues('MCP', { ...base, environment: 'BOTH', config: {} })).toEqual([]);
  });

  it('needs at least one GitHub repository with valid owner, name and branch', () => {
    expect(issues('GITHUB', { ...base, config: { repos: [] } })).toEqual(['config.repos: intel.settings.connectors.repoRequired']);
    const repo = { owner: 'duncit', repo: 'duncit-all', branch: 'staging', code: true, docs: true, issues: true, prs: true, commits: true };
    expect(issues('GITHUB', { ...base, config: { repos: [repo] } })).toEqual([]);
    expect(issues('GITHUB', { ...base, config: { repos: [{ ...repo, owner: 'a/b', branch: 'bad branch' }] } })).toEqual(['config.repos.0.owner: intel.settings.connectors.githubName', 'config.repos.0.branch: intel.settings.connectors.branchInvalid']);
  });

  it('bounds Gmail thread counts', () => {
    expect(issues('GMAIL', { ...base, config: { ...EMPTY_CONFIG.GMAIL, max_threads: 5 } })).toEqual(['config.max_threads: intel.settings.common.min({"min":10})']);
  });
});

describe('toConnectorValues', () => {
  it('starts a new MongoDB connection on staging and other sources on both', () => {
    expect(toConnectorValues('MONGODB', null).environment).toBe('STAGING');
    expect(toConnectorValues('SLACK', null).environment).toBe('BOTH');
  });

  it('fills a saved connector over the defaults and survives unreadable options', () => {
    const saved = { name: 'Prod', environment: 'PRODUCTION', env_entry_id: 'e1', enabled: false, config: '{"database":"duncit"}' } as IntelConnector;
    expect(toConnectorValues('MONGODB', saved).config).toEqual({ ...EMPTY_CONFIG.MONGODB, database: 'duncit' });
    expect(toConnectorValues('MONGODB', { ...saved, config: '{bad' }).config).toEqual(EMPTY_CONFIG.MONGODB);
  });
});

describe('built-in sources and new database connections', () => {
  const builtin = { __typename: 'IntelEntryOption', id: 'server', name: 'Duncit database', description: '', is_default: true, last_test_ok: null, environment: 'STAGING', builtin: true } as const;
  const entry = { __typename: 'IntelEntryOption', id: '65a1b2c3d4e5f6a7b8c9d0e1', name: 'Analytics', description: '', is_default: false, last_test_ok: true, environment: null, builtin: false } as const;
  const conn = { uri: '', host: '', port: 27017, username: '', password: '', auth_source: 'admin', tls: false };

  it('starts a new connector on the default option and its environment — this server’s database first', () => {
    expect(toConnectorValues('MONGODB', null, [builtin, entry])).toMatchObject({ env_entry_id: 'server', environment: 'STAGING' });
    expect(toConnectorValues('SLACK', null, [{ ...entry, is_default: true }])).toMatchObject({ env_entry_id: entry.id, environment: 'BOTH' });
    expect(toConnectorValues('GITHUB', null, [entry])).toMatchObject({ env_entry_id: entry.id });
    expect(toConnectorValues('GITHUB', null, [])).toMatchObject({ env_entry_id: '' });
  });

  it('checks an Atlas connection string', () => {
    expect(issues('MONGODB', { ...base, env_entry_id: NEW_ATLAS, config: { ...EMPTY_CONFIG.MONGODB, new_connection: { ...conn, uri: 'https://cloud.mongodb.com' } } })).toEqual(['config.new_connection.uri: intel.settings.connectors.uriInvalid']);
    expect(issues('MONGODB', { ...base, env_entry_id: NEW_ATLAS, config: { ...EMPTY_CONFIG.MONGODB, new_connection: { ...conn, uri: 'mongodb+srv://u:p@cluster0.x.mongodb.net/' } } })).toEqual([]);
  });

  it('checks every field of a self-deployed connection', () => {
    const bad = { ...conn, host: 'db.example.com:27017', port: 70000, username: ' ', password: '', auth_source: 'my db' };
    expect(issues('MONGODB', { ...base, env_entry_id: NEW_SELF_HOSTED, config: { ...EMPTY_CONFIG.MONGODB, new_connection: bad } })).toEqual([
      'config.new_connection.host: intel.settings.connectors.hostInvalid',
      'config.new_connection.port: intel.settings.common.max({"max":65535})',
      'config.new_connection.username: intel.settings.connectors.usernameRequired',
      'config.new_connection.password: intel.settings.connectors.passwordRequired',
      'config.new_connection.auth_source: intel.settings.connectors.databaseInvalid',
    ]);
    expect(newConnectionIssues(t, NEW_SELF_HOSTED, { ...conn, host: 'duncit-mongo', port: 0, username: 'u', password: 'p' })).toEqual([{ path: ['config', 'new_connection', 'port'], message: 'intel.settings.common.min({"min":1})' }]);
    expect(newConnectionIssues(t, entry.id, undefined)).toEqual([]);
  });

  it('sends a new Atlas connection with no entry id, and leaves the fields out otherwise', () => {
    const values = { ...base, env_entry_id: NEW_ATLAS, config: { ...EMPTY_CONFIG.MONGODB, new_connection: { ...conn, uri: ' mongodb+srv://u:p@c.x.mongodb.net/ ' } } };
    expect(toConnectorInput('MONGODB', values)).toMatchObject({ env_entry_id: '', config: { new_connection: { type: 'ATLAS', uri: 'mongodb+srv://u:p@c.x.mongodb.net/' } } });
    const saved = toConnectorInput('MONGODB', { ...base, env_entry_id: 'server', config: { ...EMPTY_CONFIG.MONGODB } });
    expect(saved.env_entry_id).toBe('server');
    expect(saved.config).not.toHaveProperty('new_connection');
  });

  it('sends a self-deployed connection with a numeric port and trimmed fields', () => {
    const values = { ...base, env_entry_id: NEW_SELF_HOSTED, config: { ...EMPTY_CONFIG.MONGODB, new_connection: { ...conn, host: ' db.example.com ', port: '27018' as unknown as number, username: ' intel ', password: ' p w ', tls: true } } };
    expect(toConnectorInput('MONGODB', values).config.new_connection).toEqual({ type: 'SELF_HOSTED', host: 'db.example.com', port: 27018, username: 'intel', password: ' p w ', auth_source: 'admin', tls: true });
    expect(isNewConnection(NEW_ATLAS)).toBe(true);
    expect(isNewConnection('server')).toBe(false);
  });
});
