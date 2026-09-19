import type { MockedResponse } from '@apollo/client/testing';
import type { Contract } from '@duncit/gql-types';
import {
  ARCHIVE_CONTRACT,
  CREATE_CONTRACT,
  UPDATE_CONTRACT,
} from '../../src/graphql/contracts';

/**
 * Contract mocks. The table and both writes select the `ContractFields`
 * fragment, so the factory is the schema-synced projection of that fragment —
 * a renamed server field breaks typecheck here rather than at runtime.
 */
const ISO = '2026-03-04T09:30:00.000Z';

export type ContractMock = Pick<
  Contract,
  | 'id'
  | 'contract_no'
  | 'title'
  | 'description'
  | 'content'
  | 'status'
  | 'counterparty'
  | 'effective_from'
  | 'effective_to'
  | 'signing_status'
  | 'signed_at'
  | 'is_locked'
  | 'created_by_name'
  | 'updated_by_name'
  | 'created_at'
  | 'updated_at'
> & { __typename: 'Contract'; signatories: [] };

export const makeContract = (over: Partial<ContractMock> = {}): ContractMock => ({
  __typename: 'Contract',
  id: 'ctr-1',
  contract_no: 'CTR-000042',
  title: 'Venue Partnership — Court 2',
  description: 'Weekend slots at the Indiranagar courts.',
  content: '<p>The venue grants Duncit weekend access.</p>',
  status: 'ACTIVE',
  counterparty: 'Smash Arena LLP',
  effective_from: '2026-04-01T00:00:00.000Z',
  effective_to: null,
  signing_status: 'UNSIGNED',
  signed_at: null,
  is_locked: false,
  signatories: [],
  created_by_name: 'Priya Sharma',
  updated_by_name: 'Priya Sharma',
  created_at: ISO,
  updated_at: ISO,
  ...over,
});

export const createContractMock = (contract: ContractMock = makeContract()): MockedResponse => ({
  request: { query: CREATE_CONTRACT, variables: () => true },
  result: { data: { createContract: contract } },
});

export const createContractErrorMock = (message: string): MockedResponse => ({
  request: { query: CREATE_CONTRACT, variables: () => true },
  result: { errors: [{ message }] },
});

export const updateContractMock = (contract: ContractMock = makeContract()): MockedResponse => ({
  request: { query: UPDATE_CONTRACT, variables: () => true },
  result: { data: { updateContract: contract } },
});

/** `onCall` fires each time the archive actually reaches the link. */
export const archiveContractMock = (
  id = 'ctr-1',
  onCall: () => void = () => undefined,
): MockedResponse => ({
  request: { query: ARCHIVE_CONTRACT, variables: { id } },
  result: () => {
    onCall();
    return { data: { archiveContract: { __typename: 'Contract', id, status: 'ARCHIVED' } } };
  },
});
