import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureConsole } from '../src/capture';
import type { LevelFns } from '../src/types';

type CapturedConsole = Pick<typeof console, 'error' | 'warn' | 'debug' | 'info'>;
type Handler = (event: Record<string, unknown>) => void;

const makeTarget = (): LevelFns & Record<keyof LevelFns, ReturnType<typeof vi.fn>> => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

let saved: CapturedConsole;

beforeEach(() => {
  saved = {
    error: console.error,
    warn: console.warn,
    debug: console.debug,
    info: console.info,
  };
});

afterEach(() => {
  console.error = saved.error;
  console.warn = saved.warn;
  console.debug = saved.debug;
  console.info = saved.info;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('captureConsole — console forwarding', () => {
  it('forwards error and warn to the target while keeping the original output', () => {
    const origError = vi.fn();
    const origWarn = vi.fn();
    console.error = origError;
    console.warn = origWarn;
    const target = makeTarget();

    captureConsole(target, { page: 'my-page' });
    console.error('boom', 'more');
    console.warn('careful');

    expect(origError).toHaveBeenCalledWith('boom', 'more');
    expect(origWarn).toHaveBeenCalledWith('careful');
    expect(target.error).toHaveBeenCalledWith('my-page', 'console', { message: 'boom more' });
    expect(target.warn).toHaveBeenCalledWith('my-page', 'console', { message: 'careful' });
  });

  it('serializes Error (stack / no-stack), strings, objects, circular refs, and truncates', () => {
    console.error = vi.fn();
    const target = makeTarget();
    captureConsole(target, { page: 'p' });
    const lastMessage = () => (target.error.mock.calls.at(-1)?.[2] as { message: string }).message;

    const withStack = new Error('kaput');
    console.error(withStack);
    expect(lastMessage()).toBe(withStack.stack);

    const noStack = new Error('nostack');
    delete noStack.stack;
    console.error(noStack);
    expect(lastMessage()).toBe('Error: nostack');

    console.error('plain string');
    expect(lastMessage()).toBe('plain string');

    console.error({ k: 1 });
    expect(lastMessage()).toBe('{"k":1}');

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    console.error(circular);
    expect(lastMessage()).toBe('[object Object]');

    console.error('a'.repeat(5000));
    expect(lastMessage()).toHaveLength(4000);
  });

  it('never throws when the original console method throws', () => {
    const origError = vi.fn(() => {
      throw new Error('console broke');
    });
    console.error = origError;
    const target = makeTarget();

    captureConsole(target, { page: 'p' });
    expect(() => console.error('x')).not.toThrow();
    expect(origError).toHaveBeenCalled();
    expect(target.error).toHaveBeenCalledWith('p', 'console', { message: 'x' });
  });

  it('never throws when the target logger throws', () => {
    console.error = vi.fn();
    const target = makeTarget();
    target.error.mockImplementation(() => {
      throw new Error('target broke');
    });

    captureConsole(target, { page: 'p' });
    expect(() => console.error('x')).not.toThrow();
  });

  it('only patches the requested levels', () => {
    const origWarn = vi.fn();
    console.error = vi.fn();
    console.warn = origWarn;
    const target = makeTarget();

    captureConsole(target, { levels: ['error'], page: 'p' });
    console.error('e');
    console.warn('w');

    expect(target.error).toHaveBeenCalledWith('p', 'console', { message: 'e' });
    expect(target.warn).not.toHaveBeenCalled();
    expect(origWarn).toHaveBeenCalledWith('w');
  });
});

describe('captureConsole — page resolution', () => {
  it('uses location.pathname when no explicit page is given', () => {
    console.error = vi.fn();
    vi.stubGlobal('location', { pathname: '/dashboard' });
    const target = makeTarget();

    captureConsole(target);
    console.error('x');
    expect(target.error).toHaveBeenCalledWith('/dashboard', 'console', { message: 'x' });
  });

  it('falls back to "app" with no page and no location', () => {
    console.error = vi.fn();
    const target = makeTarget();

    captureConsole(target);
    console.error('x');
    expect(target.error).toHaveBeenCalledWith('app', 'console', { message: 'x' });
  });
});

describe('captureConsole — window error listeners', () => {
  it('attaches error + unhandledrejection listeners and forwards their payloads', () => {
    console.error = vi.fn();
    const listeners: Record<string, Handler> = {};
    const addEventListener = vi.fn((type: string, cb: Handler) => {
      listeners[type] = cb;
    });
    vi.stubGlobal('window', { addEventListener });
    const target = makeTarget();

    captureConsole(target, { page: 'wp' });

    expect(addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

    listeners.error({ message: 'ReferenceError', filename: 'a.js', lineno: 12, colno: 3 });
    expect(target.error).toHaveBeenCalledWith('wp', 'window.onerror', {
      message: 'ReferenceError',
      source: 'a.js',
      line: 12,
      col: 3,
    });

    listeners.unhandledrejection({ reason: { code: 'X' } });
    expect(target.error).toHaveBeenCalledWith('wp', 'unhandledrejection', {
      reason: JSON.stringify({ code: 'X' }),
    });
  });

  it('swallows target failures inside the window listeners', () => {
    console.error = vi.fn();
    const listeners: Record<string, Handler> = {};
    vi.stubGlobal('window', {
      addEventListener: (type: string, cb: Handler) => {
        listeners[type] = cb;
      },
    });
    const target = makeTarget();
    target.error.mockImplementation(() => {
      throw new Error('boom');
    });

    captureConsole(target, { page: 'wp' });
    expect(() => listeners.error({ message: 'm' })).not.toThrow();
    expect(() => listeners.unhandledrejection({ reason: 'r' })).not.toThrow();
  });

  it('does not attach listeners when windowErrors is disabled', () => {
    console.error = vi.fn();
    const addEventListener = vi.fn();
    vi.stubGlobal('window', { addEventListener });
    const target = makeTarget();

    captureConsole(target, { windowErrors: false });
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('skips the window block when addEventListener is unavailable', () => {
    console.error = vi.fn();
    vi.stubGlobal('window', {});
    const target = makeTarget();
    expect(() => captureConsole(target)).not.toThrow();
  });
});
