import type { MockedResponse } from '@apollo/client/testing';
import type { FeatureFlag } from '@duncit/gql-types';
import {
  CREATE_FLAG,
  DELETE_FLAG,
  SET_FLAG,
  UPDATE_FLAG,
  type FeatureFlagRow,
} from '../../src/pages/feature-flags-page/queries';

/**
 * Feature-flag mocks. `makeFeatureFlag` is a fully-typed `FeatureFlag` from the
 * generated `@duncit/gql-types` schema (every required field + `__typename`), so
 * a schema change that breaks the mock surfaces as a typecheck error. The
 * `FeatureFlagRow` projection the table renders is derived from it, and the
 * mutation builders below carry `__typename` on their payloads so Apollo's
 * default `addTypename` cache stays warning-free.
 */
export const makeFeatureFlag = (over: Partial<FeatureFlag> = {}): FeatureFlag => ({
  __typename: 'FeatureFlag',
  id: 'f1',
  key: 'alpha',
  name: 'Alpha',
  description: 'a',
  enabled: false,
  is_system: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Server-side table row (non-null projection the flags table consumes). */
export const makeFeatureFlagRow = (over: Partial<FeatureFlagRow> = {}): FeatureFlagRow => {
  const f = makeFeatureFlag();
  return {
    id: f.id,
    key: f.key,
    name: f.name,
    description: f.description ?? '',
    enabled: f.enabled,
    is_system: f.is_system,
    updated_at: f.updated_at ?? '2026-01-01T00:00:00.000Z',
    ...over,
  };
};

/* ---- Mutation builders (variableMatcher: any-vars, so tests stay terse) ---- */

export const setFlagMock = (over: { error?: string } = {}): MockedResponse => ({
  request: { query: SET_FLAG },
  variableMatcher: () => true,
  result: over.error
    ? { errors: [{ message: over.error }] }
    : { data: { setFeatureFlag: { __typename: 'FeatureFlag', id: 'f1', enabled: false } } },
  maxUsageCount: 20,
});

export const createFlagMock = (over: { error?: string } = {}): MockedResponse => ({
  request: { query: CREATE_FLAG },
  variableMatcher: () => true,
  result: over.error
    ? { errors: [{ message: over.error }] }
    : { data: { createFeatureFlag: { __typename: 'FeatureFlag', id: 'new-1' } } },
  maxUsageCount: 20,
});

export const updateFlagMock = (over: { error?: string } = {}): MockedResponse => ({
  request: { query: UPDATE_FLAG },
  variableMatcher: () => true,
  result: over.error
    ? { errors: [{ message: over.error }] }
    : { data: { updateFeatureFlag: { __typename: 'FeatureFlag', id: 'f2' } } },
  maxUsageCount: 20,
});

export const deleteFlagMock = (over: { error?: string } = {}): MockedResponse => ({
  request: { query: DELETE_FLAG },
  variableMatcher: () => true,
  result: over.error ? { errors: [{ message: over.error }] } : { data: { deleteFeatureFlag: true } },
  maxUsageCount: 20,
});
