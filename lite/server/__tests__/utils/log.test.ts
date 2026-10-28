import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { log } from '../../utils/log';

let stdout: MockInstance<typeof process.stdout.write>;
let stderr: MockInstance<typeof process.stderr.write>;

beforeEach(() => {
  stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The single JSON record a spy received. */
function recordOf(spy: MockInstance<typeof process.stdout.write>): Record<string, unknown> {
  expect(spy).toHaveBeenCalledTimes(1);
  const line = String(spy.mock.calls[0][0]);
  expect(line.endsWith('\n')).toBe(true);
  return JSON.parse(line) as Record<string, unknown>;
}

describe('log', () => {
  it('writes info and debug as one JSON line on stdout with the shared fields', () => {
    log.info('auth', 'sendEmailCode', { purpose: 'SIGN_IN' });
    const record = recordOf(stdout);
    expect(record).toMatchObject({ level: 'info', app: 'lite-server', page: 'auth', component: 'sendEmailCode', purpose: 'SIGN_IN' });
    expect(Number.isNaN(Date.parse(String(record.ts)))).toBe(false);
    expect(stderr).not.toHaveBeenCalled();

    stdout.mockClear();
    log.debug('scheduler', 'tick');
    expect(recordOf(stdout)).toMatchObject({ level: 'debug', page: 'scheduler', component: 'tick' });
  });

  it('writes warnings and errors on stderr', () => {
    log.warn('db', 'disconnected');
    expect(recordOf(stderr)).toMatchObject({ level: 'warn', page: 'db', component: 'disconnected' });
    stderr.mockClear();
    log.error('email', 'send', { templateKey: 'nope' });
    expect(recordOf(stderr)).toMatchObject({ level: 'error', templateKey: 'nope' });
    expect(stdout).not.toHaveBeenCalled();
  });

  it('serializes an Error with its name, message and stack', () => {
    log.error('upload', 'post', { error: new TypeError('fetch failed') });
    const { error } = recordOf(stderr);
    expect(error).toMatchObject({ name: 'TypeError', message: 'fetch failed' });
    expect(String((error as { stack?: string }).stack)).toContain('fetch failed');
  });

  it('serializes a thrown string or object as a plain Error record', () => {
    log.error('a', 'b', { error: 'boom' });
    expect(recordOf(stderr).error).toEqual({ name: 'Error', message: 'boom' });
    stderr.mockClear();
    log.error('a', 'b', { error: { code: 11000 } });
    expect(recordOf(stderr).error).toEqual({ name: 'Error', message: '{"code":11000}' });
  });

  it('leaves the error field out when there is no error', () => {
    log.warn('a', 'b', { error: null, note: 'x' });
    const record = recordOf(stderr);
    expect(record).not.toHaveProperty('error');
    expect(record.note).toBe('x');
  });
});
