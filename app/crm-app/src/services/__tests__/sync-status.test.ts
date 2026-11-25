import { ApiError } from '@/utils/errors';
import {
  EMPTY_STATUS,
  failureCode,
  isPermanentSyncError,
  parseStatus,
  SAME_CALL_MS,
  wasLogged,
} from '../sync-status';

/** The stored sync status, and which failures may be stepped over instead of retried. */

it('reads a broken or missing status as empty, never throws', () => {
  expect(parseStatus(null)).toEqual(EMPTY_STATUS);
  expect(parseStatus('{not json')).toEqual(EMPTY_STATUS);
  expect(parseStatus('{"callAt":"yesterday","recent":"x"}')).toEqual(EMPTY_STATUS);
});

it('keeps only the newest ten logged calls and five failures', () => {
  const recent = Array.from({ length: 14 }, (_, i) => ({ k: String(i), d: i }));
  const failures = Array.from({ length: 8 }, (_, i) => ({ at: i, code: 'X', what: 'call' }));
  const status = parseStatus(JSON.stringify({ callAt: 1, recordingAt: 2, recent, failures }));
  expect(status.recent.map((c) => c.k)).toEqual([
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
  ]);
  expect(status.failures.map((f) => f.at)).toEqual([3, 4, 5, 6, 7]);
});

it('matches "this call" by number key and a start time within two minutes', () => {
  const status = { ...EMPTY_STATUS, recent: [{ k: '9811000001', d: 1_000_000 }] };
  expect(wasLogged(status, '9811000001', 1_000_000 + SAME_CALL_MS)).toBe(true);
  expect(wasLogged(status, '9811000001', 1_000_000 + SAME_CALL_MS + 1)).toBe(false);
  expect(wasLogged(status, '9811000002', 1_000_000)).toBe(false);
});

it.each([
  [new ApiError('gone', 200, { code: 'NOT_FOUND' }), true],
  [new ApiError('bad', 200, { code: 'BAD_USER_INPUT' }), true],
  [new ApiError('too big', 413), true],
  [new ApiError('signed out', 200, { code: 'UNAUTHENTICATED' }), false],
  [new ApiError('no access', 200, { code: 'FORBIDDEN' }), false],
  [new ApiError('server down', 503), false],
  [new Error('Network request failed'), false],
])('treats %s as permanent: %s', (error, permanent) => {
  expect(isPermanentSyncError(error)).toBe(permanent);
});

it('names a failure by its code, its HTTP status, or as unknown', () => {
  expect(failureCode(new ApiError('x', 200, { code: 'NOT_FOUND' }))).toBe('NOT_FOUND');
  expect(failureCode(new ApiError('x', 415))).toBe('HTTP_415');
  expect(failureCode(new Error('x'))).toBe('UNKNOWN');
});
