import type { MockedResponse } from '@apollo/client/testing';
import type { Policy, PolicyVersion } from '@duncit/gql-types';
import {
  CREATE_POLICY,
  DELETE_POLICY,
  NOTIFY_POLICY_ACCEPTED_USERS,
  POLICY_NOTIFY_RECIPIENT_COUNT,
  POLICY_VERSIONS,
  UPDATE_POLICY,
} from '../../src/graphql/policies';

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
  request: { query: CREATE_POLICY, variables: () => true },
  result: over.fail
    ? { errors: [{ message: over.fail }] }
    : { data: { createPolicy: { __typename: 'Policy', id: over.id ?? 'new-1' } } },
});

export const updatePolicyMock = (over: { id?: string } = {}): MockedResponse => ({
  request: { query: UPDATE_POLICY, variables: () => true },
  result: { data: { updatePolicy: { __typename: 'Policy', id: over.id ?? 'p1' } } },
});

export const deletePolicyMock = (id = 'p1'): MockedResponse => ({
  request: { query: DELETE_POLICY, variables: { id } },
  result: { data: { deletePolicy: true } },
});

/* ---- Wording history, change notices ---- */

export type PolicyHistoryVersionMock = Pick<
  PolicyVersion,
  | 'id'
  | 'version_no'
  | 'title'
  | 'slug'
  | 'policy_type'
  | 'content'
  | 'content_hash'
  | 'updated_by_name'
  | 'created_at'
  | 'is_current'
> & { __typename: 'PolicyVersion' };

export const makePolicyHistoryVersion = (
  over: Partial<PolicyHistoryVersionMock> = {},
): PolicyHistoryVersionMock => ({
  __typename: 'PolicyVersion',
  id: 'pv-1',
  version_no: 1,
  title: 'Privacy Policy',
  slug: 'privacy-policy',
  policy_type: 'Privacy Policy',
  content: '<p>We collect your city to show pods near you.</p>',
  content_hash: 'sha256-privacy-policy-v1',
  updated_by_name: 'Priya Sharma',
  created_at: ISO,
  is_current: false,
  ...over,
});

export const policyVersionsMock = (
  versions: PolicyHistoryVersionMock[],
  id = 'p1',
): MockedResponse => ({
  request: { query: POLICY_VERSIONS, variables: { id } },
  result: { data: { policyVersions: versions } },
});

export const policyVersionsErrorMock = (id = 'p1'): MockedResponse => ({
  request: { query: POLICY_VERSIONS, variables: { id } },
  result: { errors: [{ message: 'Policy not found' }] },
});

export const recipientCountMock = (people: number, id = 'p1'): MockedResponse => ({
  request: { query: POLICY_NOTIFY_RECIPIENT_COUNT, variables: { id } },
  result: { data: { policyNotifyRecipientCount: people } },
  maxUsageCount: 5,
});

export const notifyPolicyMock = (people: number, id = 'p1'): MockedResponse => ({
  request: { query: NOTIFY_POLICY_ACCEPTED_USERS, variables: { id, summary: '' } },
  result: { data: { notifyPolicyAcceptedUsers: people } },
});

/** An update that only answers when its variables pass `matches` — so a spec
 * can prove WHAT was sent, not just that something was. */
export const updatePolicyMatchingMock = (
  matches: (variables: Record<string, unknown>) => boolean,
): MockedResponse => ({
  request: { query: UPDATE_POLICY, variables: matches },
  result: { data: { updatePolicy: { __typename: 'Policy', id: 'p1' } } },
});
