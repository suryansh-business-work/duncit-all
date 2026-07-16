import type { MockedResponse } from '@apollo/client/testing';
import type { Location, LocationZone, Notification, User } from '@duncit/gql-types';
import {
  CREATE_NOTIFICATION,
  DELETE_NOTIFICATION,
  LOCATIONS_FOR_NOTIF,
  USERS_FOR_NOTIF,
  type NotificationRow,
} from '../../src/pages/notifications-page/queries';

/**
 * Notifications mocks. Table rows feed the mocked `@duncit/table` via props
 * (typed as the app-level `NotificationRow`). Reference-data queries + the
 * create/delete mutations flow through `MockedProvider`, so they are typed as
 * schema-synced `Pick<…>` projections carrying `__typename`.
 */
export const makeNotificationRow = (over: Partial<NotificationRow> = {}): NotificationRow => ({
  id: 'n1',
  title: 'Hello',
  body: 'Body text',
  image_url: null,
  link_url: null,
  scope: 'GLOBAL',
  silent: false,
  location_id: null,
  zone_name: null,
  target_user_ids: [],
  delivered_count: 10,
  failed_count: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

type ZoneResp = Pick<LocationZone, 'zone_name'> & { __typename: 'LocationZone' };
type LocationResp = Pick<Location, 'id' | 'location_name'> & {
  __typename: 'Location';
  location_zones: ZoneResp[];
};

export const makeLocation = (
  id: string,
  location_name: string,
  zones: string[] = [],
): LocationResp => ({
  __typename: 'Location',
  id,
  location_name,
  location_zones: zones.map((zone_name) => ({ __typename: 'LocationZone', zone_name })),
});

export const locationsMock = (
  locations: LocationResp[] = [makeLocation('l1', 'Mumbai', ['North'])],
): MockedResponse => ({
  request: { query: LOCATIONS_FOR_NOTIF },
  variableMatcher: () => true,
  result: { data: { locations } },
  maxUsageCount: 20,
});

type UserResp = Pick<User, 'user_id' | 'full_name' | 'email' | 'phone_number'> & {
  __typename: 'User';
};

export const makeUser = (over: Partial<UserResp> = {}): UserResp => ({
  __typename: 'User',
  user_id: 'u1',
  full_name: 'Alice',
  email: null,
  phone_number: '',
  ...over,
});

export const usersMock = (users: UserResp[] = [makeUser()]): MockedResponse => ({
  request: { query: USERS_FOR_NOTIF },
  variableMatcher: () => true,
  result: { data: { users } },
  maxUsageCount: 20,
});

type CreateNotificationResult = Pick<Notification, 'id' | 'delivered_count' | 'failed_count'> & {
  __typename: 'Notification';
};

export const createNotificationMock = (
  over: { delivered?: number; failed?: number; empty?: boolean; throwMessage?: string } = {},
): MockedResponse => {
  if (over.throwMessage) {
    return {
      request: { query: CREATE_NOTIFICATION },
      variableMatcher: () => true,
      result: { errors: [{ message: over.throwMessage }] },
    };
  }
  const created: CreateNotificationResult | null = over.empty
    ? null
    : {
        __typename: 'Notification',
        id: 'n1',
        delivered_count: over.delivered ?? 5,
        failed_count: over.failed ?? 2,
      };
  return {
    request: { query: CREATE_NOTIFICATION },
    variableMatcher: () => true,
    result: { data: { createNotification: created } },
  };
};

export const deleteNotificationMock = (
  over: { throwMessage?: string } = {},
): MockedResponse =>
  over.throwMessage
    ? {
        request: { query: DELETE_NOTIFICATION },
        variableMatcher: () => true,
        result: { errors: [{ message: over.throwMessage }] },
        maxUsageCount: 20,
      }
    : {
        request: { query: DELETE_NOTIFICATION },
        variableMatcher: () => true,
        result: { data: { deleteNotification: true } },
        maxUsageCount: 20,
      };
