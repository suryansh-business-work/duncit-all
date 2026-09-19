import type { MockedResponse } from '@apollo/client/testing';
import type {
  Policy,
  PolicyAcceptance,
  PolicyAcceptanceAccount,
  PolicyVersion,
} from '@duncit/gql-types';
import { POLICY_ACCEPTANCE_DETAIL } from '../../src/graphql/policyAcceptance';

/**
 * Policy-acceptance mocks: the log row, and everything the detail dialog reads
 * behind it — each a schema-synced projection carrying `__typename`.
 */
const ISO = '2026-03-04T09:30:00.000Z';
export const ACCEPTED_HASH = 'sha256-privacy-policy-v1';
export const CURRENT_HASH = 'sha256-privacy-policy-v2';

export type PolicyAcceptanceMock = Pick<
  PolicyAcceptance,
  | 'id'
  | 'user_id'
  | 'user_name'
  | 'user_email'
  | 'policy_id'
  | 'policy_no'
  | 'policy_slug'
  | 'policy_title'
  | 'content_hash'
  | 'policy_updated_at'
  | 'method'
  | 'surface'
  | 'accepted_at'
> & { __typename: 'PolicyAcceptance' };

export const makeAcceptance = (over: Partial<PolicyAcceptanceMock> = {}): PolicyAcceptanceMock => ({
  __typename: 'PolicyAcceptance',
  id: 'acc-1',
  user_id: 'user-7',
  user_name: 'Asha Rao',
  user_email: 'asha.rao@example.com',
  policy_id: 'pol-1',
  policy_no: 'POL-000001',
  policy_slug: 'privacy-policy',
  policy_title: 'Privacy Policy',
  content_hash: ACCEPTED_HASH,
  policy_updated_at: ISO,
  method: 'SIGNUP_FORM',
  surface: 'MWEB',
  accepted_at: ISO,
  ...over,
});

export type AcceptanceAccountMock = Pick<
  PolicyAcceptanceAccount,
  'id' | 'name' | 'email' | 'phone' | 'status' | 'is_deleted' | 'created_at'
> & { __typename: 'PolicyAcceptanceAccount' };

export const makeAcceptanceAccount = (
  over: Partial<AcceptanceAccountMock> = {},
): AcceptanceAccountMock => ({
  __typename: 'PolicyAcceptanceAccount',
  id: 'user-7',
  name: 'Asha Rao',
  email: 'asha.rao@example.com',
  phone: '+91 98765 43210',
  status: 'ACTIVE',
  is_deleted: false,
  created_at: ISO,
  ...over,
});

export type AcceptancePolicyMock = Pick<
  Policy,
  | 'id'
  | 'policy_no'
  | 'title'
  | 'slug'
  | 'policy_type'
  | 'is_active'
  | 'version_count'
  | 'content_hash'
  | 'updated_at'
> & { __typename: 'Policy' };

export const makeAcceptancePolicy = (
  over: Partial<AcceptancePolicyMock> = {},
): AcceptancePolicyMock => ({
  __typename: 'Policy',
  id: 'pol-1',
  policy_no: 'POL-000001',
  title: 'Privacy Policy',
  slug: 'privacy-policy',
  policy_type: 'Privacy Policy',
  is_active: true,
  version_count: 2,
  content_hash: CURRENT_HASH,
  updated_at: ISO,
  ...over,
});

export type PolicyVersionMock = Pick<
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

export const makePolicyVersion = (over: Partial<PolicyVersionMock> = {}): PolicyVersionMock => ({
  __typename: 'PolicyVersion',
  id: 'ver-1',
  version_no: 1,
  title: 'Privacy Policy',
  slug: 'privacy-policy',
  policy_type: 'Privacy Policy',
  content: '<p>We collect your city to show pods near you.</p>',
  content_hash: ACCEPTED_HASH,
  updated_by_name: 'Priya Sharma',
  created_at: ISO,
  is_current: false,
  ...over,
});

export interface AcceptanceDetailMock {
  __typename: 'PolicyAcceptanceDetail';
  acceptance: PolicyAcceptanceMock;
  account: AcceptanceAccountMock | null;
  policy: AcceptancePolicyMock | null;
  accepted_version: PolicyVersionMock | null;
  versions: PolicyVersionMock[];
  policy_history: PolicyAcceptanceMock[];
  user_acceptances: PolicyAcceptanceMock[];
}

export const makeAcceptanceDetail = (
  over: Partial<AcceptanceDetailMock> = {},
): AcceptanceDetailMock => {
  const accepted = makePolicyVersion();
  return {
    __typename: 'PolicyAcceptanceDetail',
    acceptance: makeAcceptance(),
    account: makeAcceptanceAccount(),
    policy: makeAcceptancePolicy(),
    accepted_version: accepted,
    versions: [
      accepted,
      makePolicyVersion({
        id: 'ver-2',
        version_no: 2,
        content: '<p>We also collect your locality.</p>',
        content_hash: CURRENT_HASH,
        is_current: true,
      }),
    ],
    policy_history: [makeAcceptance()],
    user_acceptances: [
      makeAcceptance(),
      makeAcceptance({
        id: 'acc-2',
        policy_id: 'pol-2',
        policy_title: 'Terms & Conditions',
        method: 'ACCOUNT',
        surface: 'APP',
      }),
    ],
    ...over,
  };
};

export const acceptanceDetailMock = (
  detail: AcceptanceDetailMock = makeAcceptanceDetail(),
  acceptanceId = 'acc-1',
): MockedResponse => ({
  request: { query: POLICY_ACCEPTANCE_DETAIL, variables: { acceptanceId } },
  result: { data: { policyAcceptanceDetail: detail } },
  maxUsageCount: 5,
});

export const acceptanceDetailErrorMock = (acceptanceId = 'acc-1'): MockedResponse => ({
  request: { query: POLICY_ACCEPTANCE_DETAIL, variables: { acceptanceId } },
  result: { errors: [{ message: 'Acceptance not found' }] },
});
