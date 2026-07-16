import type { MockedResponse } from '@apollo/client/testing';
import type { Policy } from '@duncit/gql-types';
import { CREATE_POLICY, DELETE_POLICY, UPDATE_POLICY } from '../../src/graphql/policies';

/**
 * Policy mocks. The policies table selects a field subset of the generated
 * `Policy` schema type; the factory is a schema-synced `Pick<…>` projection
 * carrying `__typename`, so schema drift breaks typecheck.
 */
const ISO = '2026-01-01T00:00:00.000Z';

export type PolicyMock = Pick<
  Policy,
  'id' | 'slug' | 'title' | 'content' | 'is_active' | 'sort_order' | 'updated_at'
> & { __typename: 'Policy' };

export const makePolicy = (over: Partial<PolicyMock> = {}): PolicyMock => ({
  __typename: 'Policy',
  id: 'p1',
  slug: 'privacy-policy',
  title: 'Privacy Policy',
  content: '<p>Body</p>',
  is_active: true,
  sort_order: 0,
  updated_at: ISO,
  ...over,
});

/* ---- Mutation builders ---- */

export const createPolicyMock = (over: { id?: string; fail?: string } = {}): MockedResponse => ({
  request: { query: CREATE_POLICY },
  variableMatcher: () => true,
  result: over.fail
    ? { errors: [{ message: over.fail }] }
    : { data: { createPolicy: { __typename: 'Policy', id: over.id ?? 'new-1' } } },
});

export const updatePolicyMock = (over: { id?: string } = {}): MockedResponse => ({
  request: { query: UPDATE_POLICY },
  variableMatcher: () => true,
  result: { data: { updatePolicy: { __typename: 'Policy', id: over.id ?? 'p1' } } },
});

export const deletePolicyMock = (id = 'p1'): MockedResponse => ({
  request: { query: DELETE_POLICY, variables: { id } },
  result: { data: { deletePolicy: true } },
});
