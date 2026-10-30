/**
 * The upcoming-pods rail every Duncit website shows under its home banner
 * (PodRail.astro): a horizontal row of pod cards, each opening the pod on mWeb.
 *
 * Framework-free, so the four Astro sites share one implementation. The pods
 * are read at VISIT time and re-read while the page stays open, so a new pod
 * appears without a deploy or a reload. mWeb's pod page asks a signed-out
 * visitor to log in first and its login screen shows the pod they picked.
 */

export interface RailPod {
  id: string;
  pod_id: string;
  club_slug: string;
  pod_title: string;
  pod_date_time: string;
  image_url: string | null;
  zone_name: string | null;
  pod_type: string;
  pod_amount: number;
}

export interface PodRailCopy {
  free: string;
  previous: string;
  next: string;
  open: string;
}

/** The `website.brand.podRail.*` key behind every word the cards draw (WEBSITE_BUNDLE). */
export const POD_RAIL_KEYS: Readonly<Record<keyof PodRailCopy, string>> = {
  free: 'website.brand.podRail.free',
  previous: 'website.brand.podRail.previous',
  next: 'website.brand.podRail.next',
  open: 'website.brand.podRail.open',
};

/** Resolve the rail's copy through a site's translator. */
export function podRailCopy(t: (key: string) => string): PodRailCopy {
  const entries = Object.entries(POD_RAIL_KEYS).map(([field, key]) => [field, t(key)]);
  return Object.fromEntries(entries) as unknown as PodRailCopy;
}

/** How many cards a rail asks for; the server caps it as well. */
export const POD_RAIL_SIZE = 12;

/** How often an open page re-reads the rail — the server's cache TTL. */
export const POD_RAIL_REFRESH_MS = 60_000;

const WEBSITE_PODS_QUERY = `query WebsiteUpcomingPods($limit: Int) {
  websiteUpcomingPods(limit: $limit) {
    id pod_id club_slug pod_title pod_date_time image_url zone_name pod_type pod_amount
  }
}`;

/** The rail's pods, or an empty list when the API does not answer (the section then stays hidden). */
export async function fetchRailPods(graphqlUrl: string): Promise<RailPod[]> {
  try {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: WEBSITE_PODS_QUERY, variables: { limit: POD_RAIL_SIZE } }),
    });
    const json = (await res.json()) as { data?: { websiteUpcomingPods?: RailPod[] }; errors?: unknown[] };
    if (!res.ok || json.errors?.length) {
      console.warn('[pod-rail] pods could not be loaded', res.status, json.errors);
      return [];
    }
    return json.data?.websiteUpcomingPods ?? [];
  } catch (error) {
    console.warn('[pod-rail] pods could not be loaded', error);
    return [];
  }
}

/** mWeb's address for a pod — the same path the app's own cards open. */
export const railPodUrl = (mwebUrl: string, pod: Pick<RailPod, 'club_slug' | 'pod_id'>): string =>
  `${mwebUrl.replace(/\/+$/, '')}/club/${encodeURIComponent(pod.club_slug)}/pod/${encodeURIComponent(pod.pod_id)}`;

/** The ticket line: the copy's word for a free pod, else the price in rupees. */
export function railPodPrice(pod: Pick<RailPod, 'pod_type' | 'pod_amount'>, copy: Pick<PodRailCopy, 'free'>, locale?: string): string {
  if (pod.pod_type === 'FREE' || !(pod.pod_amount > 0)) return copy.free;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(pod.pod_amount);
}

/** When the pod runs, in the visitor's own locale and clock. */
export function railPodWhen(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** Whether a refreshed list differs from the one on screen (by id and order). */
export const railChanged = (shown: readonly RailPod[], next: readonly RailPod[]): boolean =>
  shown.length !== next.length || shown.some((pod, i) => pod.id !== next[i]?.id || pod.pod_title !== next[i]?.pod_title);
