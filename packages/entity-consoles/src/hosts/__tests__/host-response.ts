// Test harness for the hosts console suites, not shipped code.
import type { MockedResponse } from '@apollo/client/testing';
import { HOST_DETAIL, type HostDetail } from '../queries';
import { hostRecord } from '../../../__tests__/fixtures';

/**
 * The package's host fixture as `HOST_DETAIL` answers it: every selected field,
 * with the `__typename`s MockedProvider needs to write it to the cache.
 */
export function hostPayload(over: Partial<HostDetail> = {}) {
  const host = { ...hostRecord, ...over };
  return {
    __typename: 'Host',
    ...host,
    survey_category: null,
    bank_account: { __typename: 'BankAccountVerification', ...host.bank_account },
    host_categories: host.host_categories.map((category) => ({
      __typename: 'HostCategory',
      request_no: '',
      ...category,
    })),
  };
}

/** One `HOST_DETAIL` read for `hostId`, answering `host` (null = not found). */
export const hostDetailMock = (
  hostId: string,
  host: ReturnType<typeof hostPayload> | null,
): MockedResponse => ({
  request: { query: HOST_DETAIL, variables: { host_doc_id: hostId } },
  result: { data: { host } },
});
