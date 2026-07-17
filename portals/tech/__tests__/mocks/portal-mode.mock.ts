import type { MockedResponse } from '@apollo/client/testing';
import type { PortalMode } from '@duncit/gql-types';
import { SET_PORTAL_MODE, type PortalModeRow } from '../../src/pages/portal-modes/queries';

/**
 * Portal-mode (maintenance/development) mocks. `makePortalMode` is a fully-typed
 * `PortalMode` from `@duncit/gql-types`; the `PortalModeRow` the table renders is
 * derived from it. `setPortalModeMock` carries `__typename` so the mutation
 * satisfies Apollo's default `addTypename` cache.
 */
export const makePortalMode = (over: Partial<PortalMode> = {}): PortalMode => ({
  __typename: 'PortalMode',
  id: 'p1',
  key: 'tech',
  name: 'Tech',
  kind: 'PORTAL',
  mode: 'LIVE',
  note: null,
  url: 'https://tech.duncit.com/',
  updated_at: null,
  ...over,
});

/** Server-side table row consumed by the portal-modes table. */
export const makePortalModeRow = (over: Partial<PortalModeRow> = {}): PortalModeRow => {
  const p = makePortalMode();
  return {
    id: p.id,
    key: p.key,
    name: p.name,
    kind: p.kind,
    mode: p.mode,
    note: p.note ?? null,
    url: p.url ?? null,
    updated_at: p.updated_at ?? null,
    ...over,
  };
};

export const setPortalModeMock = (over: { error?: string } = {}): MockedResponse => ({
  request: { query: SET_PORTAL_MODE },
  variableMatcher: () => true,
  result: over.error
    ? { errors: [{ message: over.error }] }
    : {
        data: {
          setPortalMode: {
            __typename: 'PortalMode',
            id: 'p1',
            key: 'crm',
            mode: 'DEVELOPMENT',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        },
      },
  maxUsageCount: 20,
});
