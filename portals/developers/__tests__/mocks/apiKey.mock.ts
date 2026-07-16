import type { MockedResponse } from '@apollo/client/testing';
import type { ApiKey, CreatedApiKey } from '@duncit/gql-types';
import {
  CREATE_API_KEY,
  MY_API_KEYS_TABLE,
  REVOKE_API_KEY,
  type ApiKeyRow,
} from '../../src/pages/api-keys/queries';

/**
 * API-key domain mocks. `makeApiKey` returns a fully-typed `ApiKey` (every
 * field + `__typename`) from the generated `@duncit/gql-types` schema, and the
 * row factory + query/mutation builders all derive from it — so a renamed or
 * removed schema field breaks typecheck instead of silently drifting. The
 * builders carry `__typename` on every object, so the `MockedProvider` cache
 * (default `addTypename: true`) behaves exactly like production.
 */

/** A demo raw key — shown exactly once at creation. Kept here so no spec inlines it. */
export const RAW_API_KEY = 'dk_live_secret';

export const makeApiKey = (over: Partial<ApiKey> = {}): ApiKey => ({
  __typename: 'ApiKey',
  id: 'k1',
  name: 'Staging',
  owner_user_id: 'u1',
  key_prefix: 'dk_abc',
  scopes: ['venues:read', 'slots:read'],
  last_used_at: '2026-02-02',
  revoked_at: null,
  created_at: '2026-01-01',
  ...over,
});

/** `CreatedApiKey`: the one-time `raw_key` plus the persisted `ApiKey`. */
export const makeCreatedApiKey = (over: Partial<CreatedApiKey> = {}): CreatedApiKey => ({
  __typename: 'CreatedApiKey',
  raw_key: RAW_API_KEY,
  api_key: makeApiKey(),
  ...over,
});

/** Table-row projection consumed by the ApiKeysTable columns. */
export const makeApiKeyRow = (over: Partial<ApiKeyRow> = {}): ApiKeyRow => {
  const key = makeApiKey();
  return {
    id: key.id,
    name: key.name,
    key_prefix: key.key_prefix,
    scopes: key.scopes,
    last_used_at: key.last_used_at ?? null,
    revoked_at: key.revoked_at ?? null,
    created_at: key.created_at,
    ...over,
  };
};

/** A revoked variant, for the Revoked-status / no-action branches. */
export const makeRevokedApiKeyRow = (over: Partial<ApiKeyRow> = {}): ApiKeyRow =>
  makeApiKeyRow({ id: 'k2', revoked_at: '2026-03-03', last_used_at: null, ...over });

/* ---- Query + mutation builders ---- */

export const myApiKeysTableMock = (rows: ApiKey[] = [makeApiKey()]): MockedResponse => ({
  request: { query: MY_API_KEYS_TABLE },
  variableMatcher: () => true,
  result: {
    data: { myApiKeysTable: { __typename: 'ApiKeyTablePage', total: rows.length, rows } },
  },
  maxUsageCount: 20,
});

export const createApiKeyMock = (
  over: { rawKey?: string; fail?: boolean } = {},
): MockedResponse => ({
  request: { query: CREATE_API_KEY },
  variableMatcher: () => true,
  result: over.fail
    ? { errors: [{ message: 'create failed' }] }
    : { data: { createApiKey: makeCreatedApiKey({ raw_key: over.rawKey ?? RAW_API_KEY }) } },
  maxUsageCount: 20,
});

/** Create that resolves with no key object — exercises the `?? null` fallback. */
export const createApiKeyEmptyMock = (): MockedResponse => ({
  request: { query: CREATE_API_KEY },
  variableMatcher: () => true,
  result: { data: { createApiKey: null } },
  maxUsageCount: 20,
});

export const revokeApiKeyMock = (
  over: { id?: string; fail?: boolean } = {},
): MockedResponse => ({
  request: { query: REVOKE_API_KEY },
  variableMatcher: () => true,
  result: over.fail
    ? { errors: [{ message: 'revoke failed' }] }
    : {
        data: { revokeApiKey: makeApiKey({ id: over.id ?? 'k1', revoked_at: '2026-03-03' }) },
      },
  maxUsageCount: 20,
});
