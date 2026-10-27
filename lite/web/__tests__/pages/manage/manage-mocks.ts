/**
 * Apollo answers the host console's tests share: the guest list, a guest
 * action and an event the reader hosts. Built from the shared fixtures so
 * every object carries the `__typename` its fragment is matched on.
 */
import type { MockedResponse } from '@apollo/client/testing';
import type { LiteEvent, LiteRegistration, LiteRegistrationStatus } from '../../../../shared/graphql/documents';
import { LITE_EVENT_REGISTRATIONS, LITE_HOST_REGISTRATION_ACTION } from '../../../graphql/manage';
import type { LiteRegistrationAction } from '../../../graphql/types';
import { eventFixture } from '../../test-utils';

/** An event the signed-in reader hosts. */
export const hostedEvent = (over: Partial<LiteEvent> = {}): LiteEvent => eventFixture({ viewer_is_host: true, ...over });

/** A refusal from the API, as a GraphQL error. */
export const apiRefusal = (message: string) => ({ errors: [{ message }] });

interface ListFilter {
  status?: LiteRegistrationStatus | null;
  search?: string | null;
}

/** `liteEventRegistrations` for event ev-1 under one filter, answered `uses` times. */
export const registrationsMock = (filter: ListFilter, rows: readonly LiteRegistration[], uses = 1): MockedResponse => ({
  request: { query: LITE_EVENT_REGISTRATIONS, variables: { event_id: 'ev-1', status: filter.status ?? null, search: filter.search ?? null } },
  result: { data: { liteEventRegistrations: rows } },
  maxUsageCount: uses,
});

/** A host's action on one guest, answering the guest as it now stands. */
export const guestActionMock = (id: string, action: LiteRegistrationAction, answer: LiteRegistration | { errors: { message: string }[] }): MockedResponse => ({
  request: { query: LITE_HOST_REGISTRATION_ACTION, variables: { id, action } },
  result: 'errors' in answer ? answer : { data: { liteHostRegistrationAction: answer } },
});
