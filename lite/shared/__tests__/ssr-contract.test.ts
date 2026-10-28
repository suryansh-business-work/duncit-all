import { describe, expect, it } from 'vitest';
import { SESSION_COOKIE, SSR_END, SSR_START, SSR_STATE_GLOBAL, serializeState } from '../ssr-contract';

describe('SSR contract', () => {
  it('names the session cookie, the window global and the root markers the server and web app share', () => {
    expect(SESSION_COOKIE).toBe('lite_session');
    expect(SSR_STATE_GLOBAL).toBe('__LITE_SSR__');
    expect(SSR_START).toBe('<!--ssr:start-->');
    expect(SSR_END).toBe('<!--ssr:end-->');
  });

  it('serializes the state as JSON the client reads back unchanged', () => {
    const state = { apollo: { 'LiteEvent:1': { title: 'Jazz & "Blues"', tags: ['live', 'outdoor'], going: 12 } }, signedIn: true };
    expect(JSON.parse(serializeState(state))).toEqual(state);
  });

  it('escapes every < so a value carrying </script> cannot close the inline script', () => {
    const state = { apollo: { 'LiteEvent:1': { title: '</script><script>alert(1)</script>' } }, signedIn: false };
    const json = serializeState(state);
    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toEqual(state);
  });

  it('serializes an anonymous render with an empty cache', () => {
    expect(JSON.parse(serializeState({ apollo: {}, signedIn: false }))).toEqual({ apollo: {}, signedIn: false });
  });
});
