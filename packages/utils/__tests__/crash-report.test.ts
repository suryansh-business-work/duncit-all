import { describe, expect, it } from 'vitest';
import {
  BOUNDARY_LOG_COMPONENT,
  buildCrashReport,
  buildCrashReportMessage,
  crashLogData,
  crashLogError,
  redactSensitive,
} from '../src/crash-report';

const NOW = new Date('2026-10-03T09:30:00.000Z');

const base = { scope: 'page' as const, route: '/pods/DUN-POD-4821', surface: 'mweb', platform: 'web' };

describe('redactSensitive', () => {
  it('scrubs tokens, credentials, email addresses and phone numbers out of error text', () => {
    const text = [
      'jwt eyJhbGciOi.eyJzdWIiOi.c2lnbmF0dXJl',
      'sent Bearer abcdefgh12345678',
      'password=hunter22 otp: 482913',
      'mail ravi.plays@duncit.com',
      'call +91 98765 43210',
    ].join(' | ');
    const out = redactSensitive(text);
    expect(out).toContain('[token]');
    expect(out).toContain('Bearer [token]');
    expect(out).toContain('password=[redacted]');
    expect(out).toContain('otp: [redacted]');
    expect(out).toContain('[email]');
    expect(out).toContain('[number]');
    expect(out).not.toMatch(/hunter22|482913|ravi\.plays|98765/);
  });

  it('leaves ordinary text alone', () => {
    expect(redactSensitive('Cannot read properties of undefined')).toBe('Cannot read properties of undefined');
  });
});

describe('buildCrashReport', () => {
  it('builds a scrubbed report from an Error, keeping the path and the first stack lines', () => {
    const error = new Error('Failed for ravi.plays@duncit.com');
    error.stack = Array.from({ length: 20 }, (_line, index) => `at frame${index}`).join('\n');
    const report = buildCrashReport({
      ...base,
      error,
      route: '/pods/DUN-POD-4821?token=abc#top',
      componentStack: '\n  at PodPage\n  at App\n',
      appVersion: '1.81.8',
      now: NOW,
    });
    expect(report).toMatchObject({
      scope: 'page',
      route: '/pods/DUN-POD-4821',
      surface: 'mweb',
      platform: 'web',
      app_version: '1.81.8',
      name: 'Error',
      message: 'Failed for [email]',
      component_stack: 'at PodPage\n  at App',
      occurred_at: '2026-10-03T09:30:00.000Z',
    });
    expect(report.stack?.split('\n')).toHaveLength(12);
    expect(report.crash_id).toMatch(/^[\da-z]+-[\da-z]+$/);
  });

  it('gives each report its own id, and reads a thrown string or anything else as an Error', () => {
    const fromString = buildCrashReport({ ...base, error: 'boom', now: NOW });
    const fromObject = buildCrashReport({ ...base, error: { code: 42 }, now: NOW });
    expect(fromString).toMatchObject({ name: 'Error', message: 'boom', stack: undefined, component_stack: undefined });
    expect(fromObject.message).toBe('Non-error value thrown');
    expect(fromString.crash_id).not.toBe(fromObject.crash_id);
  });

  it('falls back to a root path, a default name, an empty message and the current time', () => {
    const nameless = new Error('');
    nameless.name = '';
    const report = buildCrashReport({ ...base, error: nameless, route: '?only=query', componentStack: null });
    expect(report.route).toBe('/');
    expect(report.name).toBe('Error');
    expect(report.message).toBe('');
    expect(report.app_version).toBeUndefined();
    expect(Number.isNaN(Date.parse(report.occurred_at))).toBe(false);
  });
});

describe('crash log helpers', () => {
  const report = buildCrashReport({
    ...base,
    error: new TypeError('x is undefined'),
    componentStack: 'at PodPage',
    appVersion: '1.81.8',
    now: NOW,
  });

  it('logs a fresh Error carrying only the scrubbed name, message and stack', () => {
    const logged = crashLogError(report);
    expect(logged).toBeInstanceOf(Error);
    expect(logged.name).toBe('TypeError');
    expect(logged.message).toBe('x is undefined');
    expect(logged.stack).toBe(report.stack);
  });

  it('names the event and the crash in the log data, with the component stack when there is one', () => {
    expect(crashLogData(report, 'CAUGHT')).toEqual({
      event: 'CAUGHT',
      crash_id: report.crash_id,
      scope: 'page',
      surface: 'mweb',
      component_stack: 'at PodPage',
    });
    expect(crashLogData({ ...report, component_stack: undefined }, 'REPORTED')).not.toHaveProperty('component_stack');
    expect(BOUNDARY_LOG_COMPONENT).toBe('errorBoundary');
  });

  it('writes the Report an Issue body, with the version and stack only when known', () => {
    const full = buildCrashReportMessage(report);
    expect(full).toContain('Surface: mweb');
    expect(full).toContain(`Reference: ${report.crash_id}`);
    expect(full).toContain('App version: 1.81.8');
    expect(full).toContain(String(report.stack));

    const bare = buildCrashReportMessage({ ...report, app_version: undefined, stack: undefined });
    expect(bare).not.toContain('App version');
    expect(bare.split('\n')).toHaveLength(7);
  });
});
