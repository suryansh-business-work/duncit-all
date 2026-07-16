import type { MockedResponse } from '@apollo/client/testing';
import type { BouncerActor, BouncerCallbackRequest, BouncerPodInfo } from '@duncit/gql-types';
import {
  BOUNCER_CALLBACK_REQUEST,
  BOUNCER_CALLBACK_REQUESTS,
  CLOSE_CALLBACK,
  MARK_CALLBACK_CONTACTED,
} from '../../src/graphql/bouncer';

/**
 * Callback-request mocks. The callback queries select an even smaller pod
 * projection ({ id, title }) and a phone-less actor, so both are `Pick<…>`
 * of the generated schema carrying `__typename` — schema-synced and
 * production-shaped under the default `addTypename` cache.
 */
// `Required<Pick<…>>` strips the property-level `?` so nullable fields are
// `T | null` (matching the app's local interfaces), not `T | null | undefined`.
export type CallbackActorMock = Required<Pick<BouncerActor, 'id' | 'name' | 'phone'>> & {
  __typename?: 'BouncerActor';
};
export type CallbackPodMock = Required<Pick<BouncerPodInfo, 'id' | 'title'>> & {
  __typename?: 'BouncerPodInfo';
};

export type CallbackRequestMock = Required<
  Pick<
    BouncerCallbackRequest,
    | 'id'
    | 'ticket_no'
    | 'status'
    | 'reason'
    | 'contact_phone'
    | 'contacted_at'
    | 'duration_seconds'
    | 'conclusion'
    | 'created_at'
  >
> & {
  __typename?: 'BouncerCallbackRequest';
  user: CallbackActorMock;
  pod: CallbackPodMock | null;
};

export const makeCallbackActor = (over: Partial<CallbackActorMock> = {}): CallbackActorMock => ({
  __typename: 'BouncerActor',
  id: 'u1',
  name: 'Aman',
  phone: '+919800000000',
  ...over,
});

export const makeCallbackPod = (over: Partial<CallbackPodMock> = {}): CallbackPodMock => ({
  __typename: 'BouncerPodInfo',
  id: 'p1',
  title: 'Sunday Brunch',
  ...over,
});

export const makeCallbackRequest = (
  over: Partial<CallbackRequestMock> = {},
): CallbackRequestMock => ({
  __typename: 'BouncerCallbackRequest',
  id: 'cb-1',
  ticket_no: 'CB-AAA111',
  status: 'PENDING',
  reason: 'Call me about my booking',
  contact_phone: '+919800000000',
  contacted_at: null,
  duration_seconds: null,
  conclusion: null,
  created_at: new Date().toISOString(),
  user: makeCallbackActor(),
  pod: makeCallbackPod(),
  ...over,
});

const CB_LIST_VARS = { page: 1, page_size: 25, sort_by: 'created_at', sort_dir: 'desc' } as const;

export const callbackRequestsMock = (
  items: CallbackRequestMock[],
  over: { status?: string | null; search?: string | null } = {},
): MockedResponse => ({
  request: {
    query: BOUNCER_CALLBACK_REQUESTS,
    variables: { status: over.status ?? null, search: over.search ?? null, ...CB_LIST_VARS },
  },
  result: {
    data: {
      bouncerCallbackRequests: {
        __typename: 'BouncerCallbackRequestPage',
        items,
        total: items.length,
        page: 1,
        page_size: 25,
      },
    },
  },
});

// Single-use: the detail spec queues PENDING → CONTACTED → CLOSED across
// refetches, so the mock advances through the sequence rather than being reused.
export const callbackRequestMock = (
  item: CallbackRequestMock | null,
  id = 'cb-1',
): MockedResponse => ({
  request: { query: BOUNCER_CALLBACK_REQUEST, variables: { id } },
  result: { data: { bouncerCallbackRequest: item } },
});

interface CallbackActionVars {
  id?: string;
  duration_seconds?: number | null;
  conclusion?: string | null;
}

export const markContactedMock = (over: CallbackActionVars = {}): MockedResponse => {
  const id = over.id ?? 'cb-1';
  const duration_seconds = over.duration_seconds ?? null;
  const conclusion = over.conclusion ?? null;
  return {
    request: { query: MARK_CALLBACK_CONTACTED, variables: { id, duration_seconds, conclusion } },
    result: {
      data: {
        markBouncerCallbackContacted: {
          __typename: 'BouncerCallbackRequest',
          id,
          status: 'CONTACTED',
          contacted_at: 'now',
          duration_seconds,
          conclusion,
        },
      },
    },
  };
};

export const closeCallbackMock = (over: CallbackActionVars = {}): MockedResponse => {
  const id = over.id ?? 'cb-1';
  const duration_seconds = over.duration_seconds ?? null;
  const conclusion = over.conclusion ?? null;
  return {
    request: { query: CLOSE_CALLBACK, variables: { id, duration_seconds, conclusion } },
    result: {
      data: {
        closeBouncerCallback: {
          __typename: 'BouncerCallbackRequest',
          id,
          status: 'CLOSED',
          duration_seconds,
          conclusion,
        },
      },
    },
  };
};
