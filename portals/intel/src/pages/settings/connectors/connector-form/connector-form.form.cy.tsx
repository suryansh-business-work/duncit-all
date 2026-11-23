import { describe, expect, it } from 'vitest';
import type { IntelConnector } from '@duncit/gql-types';
import { EMPTY_CONFIG, makeConnectorSchema, toConnectorValues } from './connector-form.types';

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
