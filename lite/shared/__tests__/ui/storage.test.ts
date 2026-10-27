/**
 * The session cookie helpers on the server: the web app's pages render in
 * Node, where there is no `document`, and must neither throw nor pretend a
 * cookie exists. (The browser behaviour is covered under web/__tests__/shared.)
 */
import { describe, expect, it } from 'vitest';
import { readCookie, removeCookie, writeCookie } from '../../storage';

describe('cookie helpers without a document (server render)', () => {
  it('has no document to write to', () => {
    expect(globalThis.document).toBeUndefined();
  });

  it('reads no cookie', () => {
    expect(readCookie('lite_session')).toBeNull();
  });

  it('writes and removes nothing, without throwing', () => {
    expect(() => writeCookie('lite_session', 'tok-1')).not.toThrow();
    expect(() => removeCookie('lite_session')).not.toThrow();
    expect(readCookie('lite_session')).toBeNull();
  });
});
