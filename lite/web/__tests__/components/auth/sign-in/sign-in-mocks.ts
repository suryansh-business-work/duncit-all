/**
 * The four sign-in mutations as the API answers them, shared by the sign-in
 * step tests. Each answer is a `vi.fn` so a test can prove which mutation ran.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { vi } from 'vitest';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import {
  LITE_REQUEST_PHONE_SIGN_IN_CODE,
  LITE_REQUEST_SIGN_IN_CODE,
  LITE_SETTINGS,
  LITE_VERIFY_PHONE_SIGN_IN_CODE,
  LITE_VERIFY_SIGN_IN_CODE,
  type LiteSignInVia,
} from '../../../../../shared/graphql/documents';
import { APP_SETTINGS, meFixture, meMock, settingsFixture, typed } from '../../../test-utils';

export interface RequestAnswer {
  ok?: boolean;
  via?: LiteSignInVia;
  expires_in_minutes?: number;
  resend_after_seconds?: number;
  test_code?: string | null;
}

const requestResult = (answer: RequestAnswer) =>
  typed('LiteSignInRequest', { ok: true, via: 'LITE' as LiteSignInVia, expires_in_minutes: 10, resend_after_seconds: 0, test_code: null, ...answer });

/** `liteRequestSignInCode(email)` answering `answer`. */
export function emailRequestMock(email: string, answer: RequestAnswer = {}) {
  const result = vi.fn(() => ({ data: { liteRequestSignInCode: requestResult(answer) } }));
  const mock: MockedResponse = { request: { query: LITE_REQUEST_SIGN_IN_CODE, variables: { email } }, result };
  return { mock, result };
}

/** `liteRequestPhoneSignInCode(phone)` answering `answer`. */
export function phoneRequestMock(phone: string, answer: RequestAnswer = {}) {
  const result = vi.fn(() => ({ data: { liteRequestPhoneSignInCode: requestResult({ via: 'SMS', ...answer }) } }));
  const mock: MockedResponse = { request: { query: LITE_REQUEST_PHONE_SIGN_IN_CODE, variables: { phone } }, result };
  return { mock, result };
}

const payload = (token: string) => typed('LiteAuthPayload', { token, user: meFixture() });

/** `liteVerifySignInCode` answering a session token. */
export function emailVerifyMock(variables: { email: string; code: string; name?: string }, token = 'fresh-token') {
  const result = vi.fn(() => ({ data: { liteVerifySignInCode: payload(token) } }));
  const mock: MockedResponse = { request: { query: LITE_VERIFY_SIGN_IN_CODE, variables }, result };
  return { mock, result };
}

/** `liteVerifyPhoneSignInCode` answering a session token. */
export function phoneVerifyMock(variables: { phone: string; code: string; name?: string }, token = 'fresh-token') {
  const result = vi.fn(() => ({ data: { liteVerifyPhoneSignInCode: payload(token) } }));
  const mock: MockedResponse = { request: { query: LITE_VERIFY_PHONE_SIGN_IN_CODE, variables }, result };
  return { mock, result };
}

/**
 * What a completed sign-in reads again: `completeSignIn` resets the Apollo
 * store, so the settings, the date formats and the new account are fetched
 * afresh.
 */
export const afterSignInMocks = (): MockedResponse[] => [
  { request: { query: LITE_SETTINGS }, result: { data: { liteSettings: settingsFixture() } }, maxUsageCount: Number.POSITIVE_INFINITY },
  { request: { query: PUBLIC_APP_SETTINGS }, result: { data: { publicAppSettings: typed('PublicAppSettings', APP_SETTINGS) } }, maxUsageCount: Number.POSITIVE_INFINITY },
  meMock(meFixture()),
];

/** Any of the four refused by the API with `message`. */
export const refusedMock = (query: MockedResponse['request']['query'], variables: Record<string, unknown>, message: string): MockedResponse => ({
  request: { query, variables },
  result: { errors: [{ message }] },
});
