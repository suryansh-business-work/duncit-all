import { describe, expect, it } from 'vitest';
import { BLOCK_FRAME_PREFIX, blockFrameRequest } from './block-frame';

const frameRequest = (dest: string | null = 'iframe') =>
  new Request('https://site.test/x', dest ? { headers: { 'sec-fetch-dest': dest } } : undefined);

const ask = (path: string, query = '', request = frameRequest()) =>
  blockFrameRequest(path, new URL(`https://site.test${path}${query}`), request);

describe('blockFrameRequest', () => {
  it('ignores paths that are not block frames', () => {
    expect(ask('/about')).toBeNull();
  });

  it('answers an iframe load with the block, parsed props and the editor origin', () => {
    const props = encodeURIComponent(JSON.stringify({ title: 'Hi' }));
    const origin = encodeURIComponent('https://portal.test');
    expect(ask(`${BLOCK_FRAME_PREFIX}reel-slider`, `?props=${props}&origin=${origin}`)).toEqual({
      block: 'reel-slider',
      props: { title: 'Hi' },
      origin: 'https://portal.test',
    });
  });

  it('defaults to empty props and no origin when the query is absent', () => {
    expect(ask(`${BLOCK_FRAME_PREFIX}earn-showcase`)).toEqual({ block: 'earn-showcase', props: {}, origin: null });
  });

  it('refuses a request that was not loaded as an iframe', () => {
    expect(ask(`${BLOCK_FRAME_PREFIX}reel-slider`, '', frameRequest('document'))).toBe('refused');
    expect(ask(`${BLOCK_FRAME_PREFIX}reel-slider`, '', frameRequest(null))).toBe('refused');
  });

  it('refuses an empty or malformed block key', () => {
    expect(ask(BLOCK_FRAME_PREFIX)).toBe('refused');
    expect(ask(`${BLOCK_FRAME_PREFIX}Bad_Key`)).toBe('refused');
    expect(ask(`${BLOCK_FRAME_PREFIX}a/b`)).toBe('refused');
  });

  it('accepts http origins but drops non-http protocols', () => {
    const o = (raw: string) => (ask(`${BLOCK_FRAME_PREFIX}b`, `?origin=${encodeURIComponent(raw)}`) as { origin: string | null }).origin;
    expect(o('http://localhost:5173')).toBe('http://localhost:5173');
    expect(o('ftp://portal.test')).toBeNull();
  });

  it('drops an origin that is not exactly an origin (path, trailing slash)', () => {
    const o = (raw: string) => (ask(`${BLOCK_FRAME_PREFIX}b`, `?origin=${encodeURIComponent(raw)}`) as { origin: string | null }).origin;
    expect(o('https://portal.test/')).toBeNull();
    expect(o('https://portal.test/path')).toBeNull();
  });

  it('drops an origin that does not parse as a URL', () => {
    const r = ask(`${BLOCK_FRAME_PREFIX}b`, '?origin=not-a-url') as { origin: string | null };
    expect(r.origin).toBeNull();
  });
});
