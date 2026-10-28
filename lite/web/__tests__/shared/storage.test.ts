import { afterEach, describe, expect, it, vi } from 'vitest';
import { readCookie, readStored, removeCookie, removeStored, writeCookie, writeStored } from '../../../shared/storage';

const NINETY_DAYS_IN_SECONDS = 90 * 24 * 60 * 60;

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  for (const name of ['lite_session', 'other', 'blank']) document.cookie = `${name}=; Path=/; Max-Age=0`;
});

describe('localStorage helpers', () => {
  it('write, read back and remove a value', () => {
    writeStored('lite_token', 'tok-1');
    expect(readStored('lite_token')).toBe('tok-1');
    removeStored('lite_token');
    expect(readStored('lite_token')).toBeNull();
  });

  it('answer null for a key that was never written', () => {
    expect(readStored('never-written')).toBeNull();
  });

  it('never throw when storage is blocked (a private window, blocked site data)', () => {
    const blocked = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);

    expect(readStored('lite_token')).toBeNull();
    expect(() => writeStored('lite_token', 'tok-1')).not.toThrow();
    expect(() => removeStored('lite_token')).not.toThrow();
  });
});

describe('session cookie helpers', () => {
  it('mirror a value into a host-only, Lax, 90-day cookie on the whole site', () => {
    const set = vi.spyOn(Document.prototype, 'cookie', 'set');
    writeCookie('lite_session', 'tok-1');

    expect(set).toHaveBeenCalledWith(`lite_session=tok-1; Path=/; Max-Age=${NINETY_DAYS_IN_SECONDS}; SameSite=Lax`);
    expect(readCookie('lite_session')).toBe('tok-1');
  });

  it('do not mark the cookie Secure on a plain-http page (local development)', () => {
    const set = vi.spyOn(Document.prototype, 'cookie', 'set');
    writeCookie('lite_session', 'tok-1');
    expect(String(set.mock.calls[0]?.[0])).not.toContain('Secure');
    expect(String(set.mock.calls[0]?.[0])).not.toContain('Domain=');
  });

  it('encode a value holding separators and read it back intact', () => {
    writeCookie('lite_session', 'a=b; c,d');
    expect(readCookie('lite_session')).toBe('a=b; c,d');
  });

  it('pick the named cookie out of several, matching the whole name', () => {
    writeCookie('other', 'x');
    writeCookie('lite_session', 'tok-2');
    expect(readCookie('lite_session')).toBe('tok-2');
    expect(readCookie('session')).toBeNull();
  });

  it('answer null for a missing or blank cookie', () => {
    expect(readCookie('lite_session')).toBeNull();
    document.cookie = 'blank=; Path=/';
    expect(readCookie('blank')).toBeNull();
  });

  it('remove the cookie', () => {
    writeCookie('lite_session', 'tok-1');
    const set = vi.spyOn(Document.prototype, 'cookie', 'set');
    removeCookie('lite_session');
    expect(set).toHaveBeenCalledWith('lite_session=; Path=/; Max-Age=0; SameSite=Lax');
    expect(readCookie('lite_session')).toBeNull();
  });
});
