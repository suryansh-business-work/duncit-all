// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPodRail } from '../src/pod-rail-dom';
import { POD_RAIL_REFRESH_MS, type PodRailCopy, type RailPod } from '../src/pod-rail';

const copy: PodRailCopy = { free: 'Free', previous: 'Scroll back', next: 'Scroll forward', open: 'Open pod' };

const pod = (over: Partial<RailPod> = {}): RailPod => ({
  id: 'p1',
  pod_id: 'sunday-run',
  club_slug: 'run-club',
  pod_title: 'Sunday Run',
  pod_date_time: '2026-11-02T03:30:00.000Z',
  image_url: 'https://img.test/run.jpg',
  zone_name: 'Indiranagar',
  pod_type: 'PAID',
  pod_amount: 299,
  ...over,
});

function shell(withTrack = true): HTMLElement {
  document.body.innerHTML = `
    <section data-pod-rail hidden>
      <button data-pod-rail-prev></button>
      <button data-pod-rail-next></button>
      ${withTrack ? '<div data-pod-rail-track></div>' : ''}
    </section>`;
  return document.querySelector<HTMLElement>('[data-pod-rail]') as HTMLElement;
}

/** The API answers these pods, in order, one list per call (the last repeats). */
function answer(...lists: RailPod[][]) {
  let call = 0;
  const fetchMock = vi.fn().mockImplementation(async () => {
    const pods = lists[Math.min(call, lists.length - 1)];
    call += 1;
    return { ok: true, status: 200, json: async () => ({ data: { websiteUpcomingPods: pods } }) };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const flush = () => vi.advanceTimersByTimeAsync(0);
let visibility: DocumentVisibilityState;

beforeEach(() => {
  vi.useFakeTimers();
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  document.documentElement.lang = 'en-IN';
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('mountPodRail', () => {
  it('draws one link card per pod, opening it on mWeb, and shows the section', async () => {
    answer([pod(), pod({ id: 'p2', pod_id: 'yoga', pod_title: 'Morning Yoga', pod_type: 'FREE', pod_amount: 0, image_url: null, zone_name: null })]);
    const root = shell();

    mountPodRail(root, 'https://api.test/gql', 'https://mweb.test', copy);
    await flush();

    expect(root.hidden).toBe(false);
    const cards = root.querySelectorAll<HTMLAnchorElement>('.pod-rail-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].href).toBe('https://mweb.test/club/run-club/pod/sunday-run');
    expect(cards[0].getAttribute('aria-label')).toBe('Open pod: Sunday Run');
    expect(cards[0].querySelector('img')?.getAttribute('src')).toBe('https://img.test/run.jpg');
    expect(cards[0].querySelector('.pod-rail-price')?.textContent).toBe('₹299');
    expect(cards[0].querySelector('.pod-rail-place')?.textContent).toBe('Indiranagar');
    // A free pod without a cover or an area: the price word, no image, no place line.
    expect(cards[1].querySelector('img')).toBeNull();
    expect(cards[1].querySelector('.pod-rail-price')?.textContent).toBe('Free');
    expect(cards[1].querySelector('.pod-rail-place')).toBeNull();
  });

  it('leaves out the time line for a pod whose date cannot be read', async () => {
    answer([pod({ pod_date_time: 'soon' })]);
    const root = shell();
    mountPodRail(root, 'u', 'https://mweb.test', copy);
    await flush();
    expect(root.querySelectorAll('.pod-rail-meta')).toHaveLength(1);
  });

  it('stays hidden when there are no pods', async () => {
    answer([]);
    const root = shell();
    mountPodRail(root, 'u', 'https://mweb.test', copy);
    await flush();
    expect(root.hidden).toBe(true);
    expect(root.querySelectorAll('.pod-rail-card')).toHaveLength(0);
  });

  it('labels the arrows and scrolls the row by most of a view each way', async () => {
    answer([pod()]);
    const root = shell();
    const track = root.querySelector<HTMLElement>('[data-pod-rail-track]') as HTMLElement;
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 1000 });
    track.scrollBy = vi.fn();

    mountPodRail(root, 'u', 'https://mweb.test', copy);
    await flush();
    const prev = root.querySelector<HTMLButtonElement>('[data-pod-rail-prev]') as HTMLButtonElement;
    const next = root.querySelector<HTMLButtonElement>('[data-pod-rail-next]') as HTMLButtonElement;
    expect(prev.getAttribute('aria-label')).toBe('Scroll back');
    expect(next.getAttribute('aria-label')).toBe('Scroll forward');

    next.click();
    expect(track.scrollBy).toHaveBeenLastCalledWith({ left: 850, behavior: 'smooth' });
    prev.click();
    expect(track.scrollBy).toHaveBeenLastCalledWith({ left: -850, behavior: 'smooth' });
  });

  it('re-reads on its interval, redrawing only when the pods changed', async () => {
    const fetchMock = answer([pod()], [pod()], [pod(), pod({ id: 'p2', pod_title: 'New pod' })]);
    const root = shell();
    mountPodRail(root, 'u', 'https://mweb.test', copy);
    await flush();
    const firstCard = root.querySelector('.pod-rail-card');

    await vi.advanceTimersByTimeAsync(POD_RAIL_REFRESH_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Same pods: the card being read is the very same node, not a redraw.
    expect(root.querySelector('.pod-rail-card')).toBe(firstCard);

    await vi.advanceTimersByTimeAsync(POD_RAIL_REFRESH_MS);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(root.querySelectorAll('.pod-rail-card')).toHaveLength(2);
  });

  it('asks nothing while the tab is hidden, and catches up when it is shown again', async () => {
    const fetchMock = answer([pod()]);
    visibility = 'hidden';
    const root = shell();
    mountPodRail(root, 'u', 'https://mweb.test', copy);
    await vi.advanceTimersByTimeAsync(POD_RAIL_REFRESH_MS);
    expect(fetchMock).not.toHaveBeenCalled();

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    // (Rails mounted by earlier cases listen on the same document, so the
    // count is not this rail's alone — its own cards are the proof.)
    expect(fetchMock).toHaveBeenCalled();
    expect(root.hidden).toBe(false);
    expect(root.querySelectorAll('.pod-rail-card')).toHaveLength(1);
  });

  it('formats in the browser’s own locale when the page names none', async () => {
    document.documentElement.lang = '';
    answer([pod({ pod_amount: 1499 })]);
    const root = shell();
    mountPodRail(root, 'u', 'https://mweb.test', copy);
    await flush();
    expect(root.querySelector('.pod-rail-price')?.textContent).toMatch(/1,?499/);
  });

  it('keeps the cards it has and warns when a redraw fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    answer([pod()]);
    const root = shell();
    const track = root.querySelector<HTMLElement>('[data-pod-rail-track]') as HTMLElement;
    track.replaceChildren = () => {
      throw new Error('detached');
    };
    mountPodRail(root, 'u', 'https://mweb.test', copy);
    await flush();
    expect(warn).toHaveBeenCalledWith('[pod-rail] refresh failed', expect.any(Error));
  });

  it('does nothing on a shell without a track', () => {
    const fetchMock = answer([pod()]);
    const root = shell(false);
    mountPodRail(root, 'u', 'https://mweb.test', copy);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
