import { describe, expect, it } from 'vitest';
import { formatDateTime } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import {
  ACCESS_ACTION_KEY,
  LOCATION_ERROR_KEY,
  METHOD_KEY,
  REQUEST_STATUS_COLOR,
  REQUEST_STATUS_KEY,
  RESULT_COLOR,
  RESULT_KEY,
  enumLabel,
  enumOptions,
  joinParts,
  noLocationText,
  orDash,
  timeOf,
} from '../../src/pages/security/labels';
import { detailErrorText } from '../../src/pages/security/login-verifications/detailError';
import { graphQlFailure } from '../mocks/portal-security.mock';

/** A translator that marks what it translated, so a raw server value cannot pass for copy. */
const t = (key: string) => `«${key}»`;

describe('enumLabel', () => {
  it('names a known value in the reader’s language', () => {
    expect(enumLabel(t, RESULT_KEY, 'VERIFIED')).toBe('«tech.portalSecurity.result.verified»');
  });

  it('shows a value this table has not caught up with exactly as the server sent it', () => {
    expect(enumLabel(t, RESULT_KEY, 'SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });

  it.each([null, undefined, ''])('reads %p as nothing, not as a blank label', (value) => {
    expect(enumLabel(t, RESULT_KEY, value)).toBe(EM_DASH);
  });
});

describe('the values the server can send', () => {
  // Copied from server/src/modules/portals/portalSecurity/portalSecurity.constants.ts:
  // a value added there without a label here would reach a reviewer as raw capitals.
  const results = ['VERIFIED', 'EXCEPTION_APPROVED', 'LOCATION_DENIED'];
  const methods = ['GPS', 'ADMIN_EXCEPTION'];
  const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'USED', 'EXPIRED'];
  const locationErrors = ['PERMISSION_DENIED', 'POSITION_UNAVAILABLE', 'TIMEOUT', 'UNSUPPORTED'];
  const accessActions = ['LIST', 'VIEW'];

  it.each([
    ['result', RESULT_KEY, results],
    ['method', METHOD_KEY, methods],
    ['request status', REQUEST_STATUS_KEY, statuses],
    ['location error', LOCATION_ERROR_KEY, locationErrors],
    ['access action', ACCESS_ACTION_KEY, accessActions],
  ])('has a translation key for every %s', (_name, keys, values) => {
    expect(Object.keys(keys).sort()).toEqual([...values].sort());
    for (const key of Object.values(keys)) expect(key).toMatch(/^tech\.portalSecurity\./);
  });

  it('gives every result and request status a colour', () => {
    expect(Object.keys(RESULT_COLOR).sort()).toEqual([...results].sort());
    expect(Object.keys(REQUEST_STATUS_COLOR).sort()).toEqual([...statuses].sort());
  });

  it('colours a refused or declined outcome as an error and a clean one as a success', () => {
    expect(RESULT_COLOR.VERIFIED).toBe('success');
    expect(RESULT_COLOR.LOCATION_DENIED).toBe('error');
    expect(REQUEST_STATUS_COLOR.APPROVED).toBe('success');
    expect(REQUEST_STATUS_COLOR.REJECTED).toBe('error');
  });
});

describe('enumOptions', () => {
  it('offers one translated option per value, in the order the keys are written', () => {
    expect(enumOptions(t, METHOD_KEY)).toEqual([
      { value: 'GPS', label: '«tech.portalSecurity.method.gps»' },
      { value: 'ADMIN_EXCEPTION', label: '«tech.portalSecurity.method.adminException»' },
    ]);
  });
});

describe('joinParts', () => {
  it('joins the parts that exist', () => {
    expect(joinParts(['Mumbai', 'Maharashtra', 'IN'], ', ')).toBe('Mumbai, Maharashtra, IN');
  });

  it('skips a part the server did not know, rather than leaving a stray separator', () => {
    expect(joinParts(['Mumbai', null, 'IN'], ', ')).toBe('Mumbai, IN');
    expect(joinParts([undefined, 'Chrome', ''], ' · ')).toBe('Chrome');
  });

  it('is an em-dash when nothing is known', () => {
    expect(joinParts([null, undefined, ''], ', ')).toBe(EM_DASH);
    expect(joinParts([], ', ')).toBe(EM_DASH);
  });
});

describe('orDash and timeOf', () => {
  it('keeps a value and dashes an empty one', () => {
    expect(orDash('103.21.x.x')).toBe('103.21.x.x');
    expect(orDash('')).toBe(EM_DASH);
    expect(orDash(null)).toBe(EM_DASH);
  });

  it('formats a stored time with the console’s configured format', () => {
    const iso = '2026-11-20T10:30:00.000Z';
    expect(timeOf(iso)).toBe(formatDateTime(iso));
    expect(timeOf(iso)).not.toBe(iso);
  });

  it('is an em-dash for a time that was never recorded', () => {
    expect(timeOf(null)).toBe(EM_DASH);
    expect(timeOf(undefined)).toBe(EM_DASH);
  });
});

describe('noLocationText — why a record has no position', () => {
  const bare = { has_location: false, location_error: null, method: null };

  it('says a position was recorded but cannot be read, ahead of anything else', () => {
    expect(noLocationText(t, { ...bare, has_location: true, location_error: 'TIMEOUT' })).toBe(
      '«tech.loginVerifications.where.unreadable»',
    );
  });

  it.each([
    ['PERMISSION_DENIED', '«tech.portalSecurity.locationError.permissionDenied»'],
    ['POSITION_UNAVAILABLE', '«tech.portalSecurity.locationError.positionUnavailable»'],
    ['TIMEOUT', '«tech.portalSecurity.locationError.timeout»'],
    ['UNSUPPORTED', '«tech.portalSecurity.locationError.unsupported»'],
  ])('names the browser failure %s', (location_error, expected) => {
    expect(noLocationText(t, { ...bare, location_error })).toBe(expected);
  });

  it('shows a browser failure it has no wording for as the server sent it', () => {
    expect(noLocationText(t, { ...bare, location_error: 'NEW_FAILURE' })).toBe('NEW_FAILURE');
  });

  it('explains an administrator-approved alternative, which takes no location by design', () => {
    expect(noLocationText(t, { ...bare, method: 'ADMIN_EXCEPTION' })).toBe('«tech.loginVerifications.where.viaException»');
  });

  it('falls back to plainly saying nothing was recorded', () => {
    expect(noLocationText(t, bare)).toBe('«tech.loginVerifications.where.none»');
    expect(noLocationText(t, { ...bare, method: 'GPS' })).toBe('«tech.loginVerifications.where.none»');
  });
});

describe('detailErrorText — why a record could not be opened', () => {
  it('names a reviewer who has lost access', () => {
    expect(detailErrorText(t, graphQlFailure('FORBIDDEN', 'Access Denied'))).toBe(
      '«tech.loginVerifications.detail.errorForbidden»',
    );
  });

  it('names a record that has aged out of its retention window', () => {
    expect(detailErrorText(t, graphQlFailure('NOT_FOUND', 'Verification not found'))).toBe(
      '«tech.loginVerifications.detail.errorNotFound»',
    );
  });

  it('gives any other failure the generic sentence instead of a transport message', () => {
    expect(detailErrorText(t, graphQlFailure('INTERNAL_SERVER_ERROR', 'boom'))).toBe(
      '«tech.loginVerifications.detail.errorGeneric»',
    );
    expect(detailErrorText(t, new Error('Failed to fetch'))).toBe('«tech.loginVerifications.detail.errorGeneric»');
  });
});
