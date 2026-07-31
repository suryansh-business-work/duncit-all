import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import type { AudienceFilterOptions } from '@duncit/gql-types';
import {
  AUDIENCE_FILTER_OPTIONS,
  AUDIENCE_LIST,
  AUDIENCE_LIST_OWNERS,
  CREATE_AUDIENCE_LIST,
  DELETE_AUDIENCE_LIST,
} from '../../src/pages/target-audience-page/queries';
import type { AudienceListRow, AudienceRow } from '../../src/pages/target-audience-page/helpers';

/**
 * Target Audience mocks. Rows reach the (mocked) `@duncit/table` as props, so
 * they are typed against the app-level row projections; the filter options and
 * mutations flow through `MockedProvider` and carry `__typename`, matching
 * production.
 */
export const makeAudienceRow = (over: Partial<AudienceRow> = {}): AudienceRow => ({
  id: 'u1',
  full_name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  age: 29,
  city: 'Pune',
  state: 'Maharashtra',
  zone: 'Kothrud',
  pincode: '411038',
  country: 'India',
  locale: 'en-IN',
  status: 'ACTIVE',
  roles: ['USER', 'HOST'],
  email_verified: true,
  phone_verified: true,
  whatsapp_reachable: true,
  push_platforms: ['ANDROID'],
  last_login_provider: 'GOOGLE',
  last_login_at: '2026-05-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Everything nullable actually null — the Google-signup shape. */
export const makeSparseAudienceRow = (): AudienceRow =>
  makeAudienceRow({
    id: 'u2',
    full_name: '',
    email: null,
    phone: null,
    age: null,
    city: null,
    state: null,
    zone: null,
    pincode: null,
    country: null,
    locale: null,
    status: null,
    roles: [],
    email_verified: false,
    phone_verified: false,
    whatsapp_reachable: false,
    push_platforms: [],
    last_login_provider: null,
    last_login_at: null,
    created_at: null,
  });

export const makeAudienceListRow = (over: Partial<AudienceListRow> = {}): AudienceListRow => ({
  id: 'l1',
  name: 'Pune regulars',
  description: 'Everyone browsing Pune',
  owner: 'Asha Rao',
  search: '',
  member_count: 1284,
  owner_user_id: 'me',
  filters: [{ field: 'city', op: 'in', value: null, values: ['Pune'] }],
  created_at: '2026-06-01T00:00:00.000Z',
  ...over,
});

const filterOptions: AudienceFilterOptions = {
  __typename: 'AudienceFilterOptions',
  interests: [{ __typename: 'AudienceInterestOption', id: 'c1', name: 'Live Music' }],
  roles: ['HOST', 'USER'],
};

export const audienceFilterOptionsMock: MockedResponse = {
  request: { query: AUDIENCE_FILTER_OPTIONS },
  result: { data: { audienceFilterOptions: filterOptions } },
};

/** The first-paint state: no options resolved yet. */
export const audienceFilterOptionsEmptyMock: MockedResponse = {
  request: { query: AUDIENCE_FILTER_OPTIONS },
  result: {
    data: {
      audienceFilterOptions: {
        __typename: 'AudienceFilterOptions',
        interests: [],
        roles: [],
      },
    },
  },
};

export const OWNERS = [
  { __typename: 'AudienceListOwner', id: 'me', name: 'Asha Rao', email: 'asha@duncit.com', is_admin: false },
  { __typename: 'AudienceListOwner', id: 'boss', name: 'Ravi Boss', email: 'ravi@duncit.com', is_admin: true },
  { __typename: 'AudienceListOwner', id: 'nameless', name: '', email: 'new.hire@duncit.com', is_admin: false },
];

export const audienceListOwnersMock: MockedResponse = {
  request: { query: AUDIENCE_LIST_OWNERS },
  result: { data: { audienceListOwners: OWNERS } },
};

/** The audienceLists dropdown feed, shared by the campaign and notification
 * pages. Both query the same document. */
export const audienceListsFeedMock = (query: any, lists = [
  { __typename: 'AudienceList', id: 'a1', name: 'Pune regulars', member_count: 1284 },
]): MockedResponse => ({
  request: { query },
  result: { data: { audienceLists: lists } },
});

export const audienceListOwnersEmptyMock: MockedResponse = {
  request: { query: AUDIENCE_LIST_OWNERS },
  result: { data: { audienceListOwners: [] } },
};

const toGqlList = (row: AudienceListRow) => ({
  __typename: 'AudienceList',
  ...row,
  filters: row.filters.map((f) => ({ __typename: 'AudienceListFilter', ...f })),
});

export const audienceListMock = (row = makeAudienceListRow()): MockedResponse => ({
  request: { query: AUDIENCE_LIST, variables: { id: row.id } },
  result: { data: { audienceList: toGqlList(row) } },
});

export const audienceListMissingMock = (id = 'gone'): MockedResponse => ({
  request: { query: AUDIENCE_LIST, variables: { id } },
  result: { data: { audienceList: null } },
});

export const audienceListFailedMock = (id = 'l1', message = 'boom'): MockedResponse => ({
  request: { query: AUDIENCE_LIST, variables: { id } },
  result: { errors: [new GraphQLError(message)] },
});

/** A server-side rejection, which is what parseApiError is written against —
 * a network `error` would collapse to the generic offline copy instead. */
const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

export const createAudienceListMock = (
  input: Record<string, unknown>,
  failWith?: string,
): MockedResponse => ({
  request: { query: CREATE_AUDIENCE_LIST, variables: { input } },
  ...(failWith
    ? rejection(failWith)
    : { result: { data: { createAudienceList: { __typename: 'AudienceList', id: 'l9', name: String(input.name) } } } }),
});

export const deleteAudienceListMock = (id = 'l1', failWith?: string): MockedResponse => ({
  request: { query: DELETE_AUDIENCE_LIST, variables: { id } },
  ...(failWith ? rejection(failWith) : { result: { data: { deleteAudienceList: true } } }),
});
