/**
 * Mounts the upcoming-pods rail onto the shell PodRail.astro renders. See
 * pod-rail.ts for the rules it keeps; this file is only the DOM.
 */
import {
  POD_RAIL_REFRESH_MS,
  fetchRailPods,
  railChanged,
  railPodPrice,
  railPodUrl,
  railPodWhen,
  type PodRailCopy,
  type RailPod,
} from './pod-rail';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** One card: the cover, the title, when and where, and the ticket price. */
function buildCard(pod: RailPod, mwebUrl: string, copy: PodRailCopy, locale: string | undefined): HTMLElement {
  const card = el('a', 'pod-rail-card');
  card.href = railPodUrl(mwebUrl, pod);
  card.setAttribute('aria-label', `${copy.open}: ${pod.pod_title}`);
  card.setAttribute('role', 'listitem');

  const cover = el('div', 'pod-rail-cover');
  if (pod.image_url) {
    const img = el('img', 'pod-rail-img');
    img.src = pod.image_url;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    cover.append(img);
  }
  cover.append(el('span', 'pod-rail-price', railPodPrice(pod, copy, locale)));

  const body = el('div', 'pod-rail-body');
  body.append(el('h3', 'pod-rail-title', pod.pod_title));
  const when = railPodWhen(pod.pod_date_time, locale);
  if (when) body.append(el('p', 'pod-rail-meta', when));
  if (pod.zone_name) body.append(el('p', 'pod-rail-meta pod-rail-place', pod.zone_name));

  card.append(cover, body);
  return card;
}

function render(root: HTMLElement, track: HTMLElement, pods: readonly RailPod[], mwebUrl: string, copy: PodRailCopy) {
  const locale = document.documentElement.lang || undefined;
  track.replaceChildren(...pods.map((pod) => buildCard(pod, mwebUrl, copy, locale)));
  root.hidden = pods.length === 0;
}

/** Scroll the track by most of a view, so the next cards land where these were. */
function wireArrows(root: HTMLElement, track: HTMLElement, copy: PodRailCopy) {
  const by = (direction: 1 | -1) => () =>
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  const prev = root.querySelector<HTMLButtonElement>('[data-pod-rail-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-pod-rail-next]');
  prev?.setAttribute('aria-label', copy.previous);
  next?.setAttribute('aria-label', copy.next);
  prev?.addEventListener('click', by(-1));
  next?.addEventListener('click', by(1));
}

/**
 * Draw the rail now, then re-read it every POD_RAIL_REFRESH_MS while the tab
 * is visible, redrawing only when the pods actually changed — so a card being
 * read never jumps under the visitor for nothing.
 */
export function mountPodRail(root: HTMLElement, graphqlUrl: string, mwebUrl: string, copy: PodRailCopy) {
  const track = root.querySelector<HTMLElement>('[data-pod-rail-track]');
  if (!track) return;
  wireArrows(root, track, copy);
  let shown: RailPod[] = [];
  const refresh = async () => {
    if (document.visibilityState === 'hidden') return;
    const pods = await fetchRailPods(graphqlUrl);
    if (!railChanged(shown, pods)) return;
    shown = pods;
    render(root, track, pods, mwebUrl, copy);
  };
  // A failed redraw keeps the cards already shown; the next tick tries again.
  const run = () => {
    refresh().catch((error: unknown) => console.warn('[pod-rail] refresh failed', error));
  };
  run();
  globalThis.setInterval(run, POD_RAIL_REFRESH_MS);
  document.addEventListener('visibilitychange', run);
}
