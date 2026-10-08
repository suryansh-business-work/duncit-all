/**
 * Live blocks (the reel slider, the earn showcase, the newsletter…) are the
 * site renderer's own components: the console cannot draw them. In the
 * designer each one is a frame of `https://<site domain>/__block/<key>`, which
 * draws it in the site's design system and posts its height back, so the frame
 * fits it. The frame takes no pointer events: a click selects the block.
 */

/** A block's frame address, or null when the site has no domain to draw it on. */
export type BlockFrameUrl = (block: string, props: Record<string, unknown>) => string | null;

/** What the frame posts (cms-site BlockFrame.astro). */
const HEIGHT_MESSAGE = 'cms-block-height';
/** Until the frame reports, it holds a band of space the size of a small section. */
const FIRST_HEIGHT = '20rem';

export function blockFrameUrl(domain: string | undefined, editorOrigin: string): BlockFrameUrl {
  if (!domain) return () => null;
  return (block, props) => {
    const params = new URLSearchParams({ origin: editorOrigin });
    if (Object.keys(props).length) params.set('props', JSON.stringify(props));
    return `https://${domain}/__block/${encodeURIComponent(block)}?${params.toString()}`;
  };
}

const releases = new WeakMap<HTMLElement, (() => void)[]>();

/** Stops listening for every frame drawn inside `owner`. */
export function releaseBlockFrames(owner: HTMLElement) {
  releases.get(owner)?.forEach((release) => release());
  releases.delete(owner);
}

const isHeight = (data: unknown): data is { height: number } => {
  const message = data as { type?: unknown; height?: unknown } | null;
  // 0 is a real answer: a reel slider with no reels draws nothing (the block's outline still marks its place).
  return message?.type === HEIGHT_MESSAGE && typeof message.height === 'number' && message.height >= 0;
};

/** Draws `target` (a `<cms-block>`) as a frame of `src`, owned by `owner` for its clean-up. */
export function mountBlockFrame(owner: HTMLElement, target: HTMLElement, src: string, title: string) {
  const doc = target.ownerDocument;
  const frame = doc.createElement('iframe');
  frame.src = src;
  frame.title = title;
  frame.loading = 'lazy';
  // A picture of the block, not something to tab into: the designer selects it.
  frame.tabIndex = -1;
  frame.style.cssText = `display:block;width:100%;height:${FIRST_HEIGHT};border:0;pointer-events:none`;
  target.replaceChildren(frame);
  target.dataset.cmsLive = 'true';

  const origin = new URL(src).origin;
  const onMessage = (event: MessageEvent) => {
    if (event.source === frame.contentWindow && event.origin === origin && isHeight(event.data)) frame.style.height = `${event.data.height}px`;
  };
  const win = doc.defaultView;
  win?.addEventListener('message', onMessage);
  releases.set(owner, [...(releases.get(owner) ?? []), () => win?.removeEventListener('message', onMessage)]);
}
