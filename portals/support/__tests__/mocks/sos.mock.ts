import type { MockedResponse } from '@apollo/client/testing';
import type { BouncerActor, BouncerGeo, BouncerPodInfo, BouncerSosAlert } from '@duncit/gql-types';
import {
  ACK_SOS,
  BOUNCER_SOS_ALERT,
  BOUNCER_SOS_ALERTS,
  RESOLVE_SOS,
} from '../../src/graphql/bouncer';

/**
 * SOS-alert mocks. The bouncer queries select trimmed projections of the full
 * schema types (`BouncerSosAlert` has ~14 fields, its actor/pod/geo refs a few
 * each), so every entity is modelled as a `Pick<…>` bound to the generated
 * `@duncit/gql-types` schema — a renamed/removed field breaks typecheck without
 * fabricating irrelevant fields — and carries `__typename` so the default
 * `addTypename` cache normalises exactly like production.
 */
// `Required<Pick<…>>` strips the property-level `?` so nullable fields are
// `T | null` (matching the app's local interfaces the components consume), not
// `T | null | undefined`, while staying bound to the generated schema.
export type BouncerActorMock = Required<Pick<BouncerActor, 'id' | 'name' | 'phone' | 'avatar_url'>> & {
  __typename?: 'BouncerActor';
};
export type BouncerGeoMock = Required<Pick<BouncerGeo, 'lat' | 'lng' | 'accuracy'>> & {
  __typename?: 'BouncerGeo';
};
export type BouncerPodMock = Required<
  Pick<BouncerPodInfo, 'id' | 'title' | 'venue_name' | 'club_name' | 'starts_at'>
> & { __typename?: 'BouncerPodInfo' };

export type SosAlertMock = Required<
  Pick<
    BouncerSosAlert,
    | 'id'
    | 'ticket_no'
    | 'status'
    | 'message'
    | 'contact_phone'
    | 'acknowledged_at'
    | 'resolved_at'
    | 'created_at'
  >
> & {
  __typename?: 'BouncerSosAlert';
  location: BouncerGeoMock | null;
  user: BouncerActorMock;
  host: BouncerActorMock | null;
  pod: BouncerPodMock;
};

export const makeBouncerActor = (over: Partial<BouncerActorMock> = {}): BouncerActorMock => ({
  __typename: 'BouncerActor',
  id: 'u1',
  name: 'Riya',
  phone: null,
  avatar_url: null,
  ...over,
});

export const makeBouncerGeo = (over: Partial<BouncerGeoMock> = {}): BouncerGeoMock => ({
  __typename: 'BouncerGeo',
  lat: 19.07,
  lng: 72.87,
  accuracy: 12,
  ...over,
});

export const makeBouncerPod = (over: Partial<BouncerPodMock> = {}): BouncerPodMock => ({
  __typename: 'BouncerPodInfo',
  id: 'p1',
  title: 'Saturday Run',
  venue_name: 'Park',
  club_name: null,
  starts_at: null,
  ...over,
});

export const makeSosAlert = (over: Partial<SosAlertMock> = {}): SosAlertMock => ({
  __typename: 'BouncerSosAlert',
  id: 'sos-1',
  ticket_no: 'SOS-AAA111',
  status: 'ACTIVE',
  message: 'help',
  contact_phone: '+919800000000',
  acknowledged_at: null,
  resolved_at: null,
  created_at: new Date().toISOString(),
  location: null,
  user: makeBouncerActor(),
  host: null,
  pod: makeBouncerPod(),
  ...over,
});

const SOS_LIST_VARS = { page: 1, page_size: 25, sort_by: 'created_at', sort_dir: 'desc' } as const;

export const sosAlertsMock = (
  alerts: SosAlertMock[],
  over: { status?: string | null; search?: string | null } = {},
): MockedResponse => ({
  request: {
    query: BOUNCER_SOS_ALERTS,
    variables: { status: over.status ?? null, search: over.search ?? null, ...SOS_LIST_VARS },
  },
  result: {
    data: {
      bouncerSosAlerts: {
        __typename: 'BouncerSosAlertPage',
        items: alerts,
        total: alerts.length,
        page: 1,
        page_size: 25,
      },
    },
  },
});

// Single-use: the detail spec queues ACTIVE → ACKNOWLEDGED → RESOLVED across
// refetches, so the mock advances through the sequence rather than being reused.
export const sosAlertMock = (alert: SosAlertMock | null, id = 'sos-1'): MockedResponse => ({
  request: { query: BOUNCER_SOS_ALERT, variables: { id } },
  result: { data: { bouncerSosAlert: alert } },
});

export const ackSosMock = (id = 'sos-1'): MockedResponse => ({
  request: { query: ACK_SOS, variables: { id } },
  result: {
    data: {
      acknowledgeBouncerSos: {
        __typename: 'BouncerSosAlert',
        id,
        status: 'ACKNOWLEDGED',
        acknowledged_at: 'now',
      },
    },
  },
});

export const resolveSosMock = (id = 'sos-1'): MockedResponse => ({
  request: { query: RESOLVE_SOS, variables: { id } },
  result: {
    data: {
      resolveBouncerSos: {
        __typename: 'BouncerSosAlert',
        id,
        status: 'RESOLVED',
        resolved_at: 'now',
      },
    },
  },
});
