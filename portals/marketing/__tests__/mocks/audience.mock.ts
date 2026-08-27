import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import type { AudienceFilterOptions } from '@duncit/gql-types';
import {
  ADD_AUDIENCE_LIST_MEMBERS,
  AUDIENCE_FILTER_OPTIONS,
  AUDIENCE_LIST,
  AUDIENCE_LIST_CANDIDATES,
  AUDIENCE_LIST_OWNERS,
  CREATE_AUDIENCE_LIST,
  DELETE_AUDIENCE_LIST,
  REMOVE_AUDIENCE_LIST_MEMBER,
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
  manual_member_count: 0,
  excluded_member_count: 0,
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

/** Somebody the Add-user picker may still offer — the server has already taken
 * the list's own members out, which is what the picker is asserting. */
export const makePickableUser = (over: Record<string, unknown> = {}) => ({
  __typename: 'AudienceMember',
  id: 'u9',
  full_name: 'Vikram Nair',
  email: 'vikram@example.com',
  phone: '9811111111',
  ...over,
});

/** The picker's feed. `search` and `page` are part of the request, so a spec
 * that types into the box must build the mock for the search it typed. */
export const audienceListCandidatesMock = (
  users: Record<string, unknown>[] = [makePickableUser()],
  { listId = 'l1', search = '', page = 1 } = {},
): MockedResponse => ({
  request: {
    query: AUDIENCE_LIST_CANDIDATES,
    variables: { list_id: listId, query: { search, page, page_size: 25 } },
  },
  result: {
    data: {
      audienceListCandidatesTable: {
        __typename: 'AudienceTablePage',
        total: users.length,
        rows: users,
      },
    },
  },
});

/** The counts both member mutations answer with — Apollo normalises them
 * straight into the detail page's chips. */
const listCounts = (over: Record<string, number> = {}) => ({
  __typename: 'AudienceList',
  id: 'l1',
  manual_member_count: 0,
  excluded_member_count: 0,
  member_count: 1284,
  ...over,
});

export const addAudienceListMembersMock = (
  userIds = ['u9'],
  { listId = 'l1', failWith = '' } = {},
): MockedResponse => ({
  request: { query: ADD_AUDIENCE_LIST_MEMBERS, variables: { id: listId, user_ids: userIds } },
  ...(failWith
    ? rejection(failWith)
    : {
        result: {
          data: {
            addAudienceListMembers: listCounts({
              manual_member_count: userIds.length,
              member_count: 1285,
            }),
          },
        },
      }),
});

export const removeAudienceListMemberMock = (
  userId = 'u1',
  { listId = 'l1', failWith = '' } = {},
): MockedResponse => ({
  request: { query: REMOVE_AUDIENCE_LIST_MEMBER, variables: { id: listId, user_id: userId } },
  ...(failWith
    ? rejection(failWith)
    : {
        result: {
          data: {
            removeAudienceListMember: listCounts({
              excluded_member_count: 1,
              member_count: 1283,
            }),
          },
        },
      }),
});
