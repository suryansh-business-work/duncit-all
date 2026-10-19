import { afterEach, describe, expect, it } from 'vitest';
import { blockFrameUrl, mountBlockFrame, releaseBlockFrames } from '../../src/pages/cms/editor/blockFrame';

const EDITOR_ORIGIN = 'https://console.test';
const SITE_ORIGIN = 'https://site.test';

describe('blockFrameUrl', () => {
  it('draws nothing for a site without a domain', () => {
    const url = blockFrameUrl(undefined, EDITOR_ORIGIN);
    expect(url('newsletter', { heading: 'Hi' })).toBeNull();
    expect(blockFrameUrl('', EDITOR_ORIGIN)('newsletter', {})).toBeNull();
  });

  it("points at the site's own block route, telling it who is asking", () => {
    const url = blockFrameUrl('site.test', EDITOR_ORIGIN);
    expect(url('reel-slider', {})).toBe('https://site.test/__block/reel-slider?origin=https%3A%2F%2Fconsole.test');
  });

  it('carries the props as JSON and escapes the block name', () => {
    const src = blockFrameUrl('site.test', EDITOR_ORIGIN)('odd block/name', { heading: 'Join us', stores: ['ios'] });
    const parsed = new URL(src ?? '');
    expect(parsed.pathname).toBe('/__block/odd%20block%2Fname');
    expect(parsed.searchParams.get('origin')).toBe(EDITOR_ORIGIN);
    expect(JSON.parse(parsed.searchParams.get('props') ?? '')).toEqual({ heading: 'Join us', stores: ['ios'] });
  });
});

describe('mountBlockFrame', () => {
  const mounted: HTMLElement[] = [];

  /** A `<cms-block>` in the page, so its frame gets a real window to post from. */
  const placeBlock = () => {
    const owner = document.createElement('div');
    const target = document.createElement('cms-block');
    target.textContent = 'stand-in';
    owner.append(target);
    document.body.append(owner);
    mounted.push(owner);
    return { owner, target };
  };

  const frameOf = (target: HTMLElement) => {
    const frame = target.querySelector('iframe');
    if (!frame) throw new Error('no frame drawn');
    return frame;
  };

  /** The window the page's listeners live on (the one `ownerDocument.defaultView` hands out). */
  const view = () => {
    const win = document.defaultView;
    if (!win) throw new Error('jsdom has no window');
    return win;
  };

  const post = (data: unknown, { origin = SITE_ORIGIN, source }: { origin?: string; source: Window | null }) => {
    const event = new (view().MessageEvent)('message', { data, origin });
    Object.defineProperty(event, 'source', { value: source });
    view().dispatchEvent(event);
  };

  afterEach(() => {
    for (const owner of mounted.splice(0)) {
      releaseBlockFrames(owner);
      owner.remove();
    }
  });

  it('replaces the stand-in with an untabbable, unclickable frame of the block', () => {
    const { owner, target } = placeBlock();
    mountBlockFrame(owner, target, `${SITE_ORIGIN}/__block/newsletter`, 'Live block: newsletter');

    const frame = frameOf(target);
    expect(target.childNodes).toHaveLength(1);
    expect(target.textContent).toBe('');
    expect(frame.src).toBe(`${SITE_ORIGIN}/__block/newsletter`);
    expect(frame.title).toBe('Live block: newsletter');
    expect(frame.loading).toBe('lazy');
    expect(frame.tabIndex).toBe(-1);
    expect(frame.style.height).toBe('20rem');
    expect(target.dataset.cmsLive).toBe('true');
  });

  it('fits the frame to the height its own page reports, zero included', () => {
    const { owner, target } = placeBlock();
    mountBlockFrame(owner, target, `${SITE_ORIGIN}/__block/reel-slider?origin=x`, 'Reels');
    const frame = frameOf(target);

    post({ type: 'cms-block-height', height: 412 }, { source: frame.contentWindow });
    expect(frame.style.height).toBe('412px');

    post({ type: 'cms-block-height', height: 0 }, { source: frame.contentWindow });
    expect(frame.style.height).toBe('0px');
  });

  it('ignores messages from another origin, another window, or of another shape', () => {
    const { owner, target } = placeBlock();
    mountBlockFrame(owner, target, `${SITE_ORIGIN}/__block/newsletter`, 'Newsletter');
    const frame = frameOf(target);
    const source = frame.contentWindow;

    post({ type: 'cms-block-height', height: 300 }, { source, origin: 'https://evil.test' });
    post({ type: 'cms-block-height', height: 300 }, { source: view() });
    post({ type: 'something-else', height: 300 }, { source });
    post({ type: 'cms-block-height', height: '300' }, { source });
    post({ type: 'cms-block-height', height: -5 }, { source });
    post(null, { source });

    expect(frame.style.height).toBe('20rem');
  });

  it('stops listening for every frame of an owner once it is released', () => {
    const { owner, target } = placeBlock();
    const second = document.createElement('cms-block');
    owner.append(second);
    mountBlockFrame(owner, target, `${SITE_ORIGIN}/__block/newsletter`, 'One');
    mountBlockFrame(owner, second, `${SITE_ORIGIN}/__block/app-download`, 'Two');
    const first = frameOf(target);
    const other = frameOf(second);

    releaseBlockFrames(owner);
    post({ type: 'cms-block-height', height: 150 }, { source: first.contentWindow });
    post({ type: 'cms-block-height', height: 150 }, { source: other.contentWindow });

    expect(first.style.height).toBe('20rem');
    expect(other.style.height).toBe('20rem');
    // Releasing again (a re-render of an already-cleared block) is harmless.
    expect(() => releaseBlockFrames(owner)).not.toThrow();
  });

  it('still draws the frame in a document that has no window to listen on', () => {
    const detached = document.implementation.createHTMLDocument('detached');
    const owner = detached.createElement('div');
    const target = detached.createElement('cms-block');
    owner.append(target);

    mountBlockFrame(owner, target, `${SITE_ORIGIN}/__block/policy-strip`, 'Policies');

    expect(frameOf(target).title).toBe('Policies');
    expect(() => releaseBlockFrames(owner)).not.toThrow();
  });
});
