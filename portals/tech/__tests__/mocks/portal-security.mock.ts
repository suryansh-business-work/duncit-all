import { CombinedGraphQLErrors } from '@apollo/client';
import type { LogDetail, LogRow } from '../../src/pages/security/login-verifications/queries';
import type { RequestRow } from '../../src/pages/security/verification-requests/queries';

/** One row of the login-verification log, as the list query returns it: a masked address and a coarse place. */
export const logRow = (over: Partial<LogRow> = {}): LogRow => ({
  id: 'log-1',
  created_at: '2026-11-20T10:30:00.000Z',
  user_name: 'Asha Rao',
  user_email: 'asha@duncit.com',
  roles: ['TECH_MANAGER'],
  portal_key: 'tech',
  result: 'VERIFIED',
  method: 'GPS',
  is_employee: true,
  employee_title: 'Platform Engineer',
  ip_masked: '103.21.x.x',
  ip_city: 'Mumbai',
  ip_region: 'Maharashtra',
  ip_country: 'IN',
  has_location: true,
  browser: 'Chrome 126',
  os: 'Windows 11',
  ...over,
});

/** The same verification opened in full: the whole address, the position and the trail around it. */
export const logDetail = (over: Partial<LogDetail> = {}): LogDetail => ({
  id: 'log-1',
  created_at: '2026-11-20T10:30:00.000Z',
  signed_in_at: '2026-11-20T10:28:00.000Z',
  user_name: 'Asha Rao',
  user_email: 'asha@duncit.com',
  roles: ['TECH_MANAGER', 'SUPER_ADMIN'],
  portal_key: 'tech',
  result: 'VERIFIED',
  method: 'GPS',
  is_employee: true,
  employee_title: 'Platform Engineer',
  employee_department: 'Engineering',
  employment_type: 'Full time',
  current_is_employee: true,
  current_employee_title: 'Staff Engineer',
  ip: '103.21.44.9',
  ip_city: 'Mumbai',
  ip_region: 'Maharashtra',
  ip_country: 'IN',
  has_location: true,
  latitude: 19.076,
  longitude: 72.8777,
  accuracy_m: 38.4,
  location_error: null,
  browser: 'Chrome 126',
  os: 'Windows 11',
  device_type: 'desktop',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0',
  duid: 'duid-7f3a',
  timezone: 'Asia/Kolkata',
  language: 'en-IN',
  platform: 'Windows',
  policy_version: '2026-11-23.1',
  notice_version: '2026-11-23.1',
  consent: {
    authorized_person: true,
    credentials_not_shared: true,
    policies_acknowledged: true,
    location_consent: true,
  },
  exception: null,
  related: [
    { id: 'log-0', created_at: '2026-11-19T09:00:00.000Z', portal_key: 'finance', result: 'VERIFIED', method: 'GPS' },
  ],
  access_history: [
    { id: 'acc-1', actor_name: 'Rohan Mehta', action: 'VIEW', created_at: '2026-11-21T08:15:00.000Z' },
  ],
  ...over,
});

/** One alternative-verification request. */
export const requestRow = (over: Partial<RequestRow> = {}): RequestRow => ({
  id: 'req-1',
  user_name: 'Meera Iyer',
  portal_key: 'finance',
  reason: 'My work laptop has no location service and the browser never shows the prompt.',
  location_error: 'POSITION_UNAVAILABLE',
  status: 'PENDING',
  decided_by_name: null,
  decided_at: null,
  decision_note: null,
  created_at: '2026-11-21T07:00:00.000Z',
  ...over,
});

/** A GraphQL refusal the way Apollo 4 throws it. */
export const graphQlFailure = (code: string, message = code): CombinedGraphQLErrors =>
  new CombinedGraphQLErrors({ errors: [{ message, extensions: { code } }] });
