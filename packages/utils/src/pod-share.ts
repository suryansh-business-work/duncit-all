/**
 * What a shared pod says — one definition for mWeb and native (rule 27).
 *
 * The two surfaces had grown separate builders that had already drifted: mWeb's
 * omitted the pod title and returned no link at all (the URL rode alongside as a
 * separate `navigator.share` field, so recipients on apps that ignore it got a
 * bare "When/Where"), while native's carried the title but no map. Neither
 * offered a way to actually FIND the venue.
 *
 * Date formatting stays with the caller: each surface formats through its own
 * admin-configured clock (rule 11), so passing the finished string in keeps this
 * module framework-free and still lets both render the same wording.
 */

export interface PodShareVenue {
  place_label?: string | null;
  place_detail?: string | null;
}

/** Google Maps' documented cross-platform search URL — resolves on Android,
 * iOS and the web, and needs no API key. */
const MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';

/**
 * A map link for the pod's venue, built from the venue text because a Pod
 * carries only `venue_id` and no coordinates. `null` for a pod with no place at
 * all (a virtual pod), so the caller drops the line rather than sharing a link
 * that searches for nothing.
 */
export function podMapLink(pod: PodShareVenue | null | undefined): string | null {
  const query = [pod?.place_label, pod?.place_detail].filter(Boolean).join(', ').trim();
  if (!query) return null;
  return `${MAPS_SEARCH}${encodeURIComponent(query)}`;
}

export interface PodShareInput {
  title?: string | null;
  /** Already formatted by the caller's own date/time formatter. */
  whenText?: string | null;
  venue: PodShareVenue | null | undefined;
  /** Absolute pod URL. */
  url: string;
  /**
   * The venue map link, when the caller holds a tracked one for it. Left out,
   * the plain Google Maps search is built from the venue text instead: the
   * message reads the same either way, only one of the two is counted.
   */
  mapUrl?: string | null;
}

/**
 * The shared message: title, when, a map link for the venue, then the pod link —
 * in that order, one per line. Every part except the URL is optional; a missing
 * one drops its line instead of leaving a dangling label.
 */
export function buildPodShareMessage(input: PodShareInput): string {
  const lines: string[] = [];
  const title = input.title?.trim();
  if (title) lines.push(title);
  const when = input.whenText?.trim();
  if (when) lines.push(`When: ${when}`);

  const where = [input.venue?.place_label, input.venue?.place_detail]
    .filter(Boolean)
    .join(' · ')
    .trim();
  if (where) lines.push(`Where: ${where}`);

  const map = input.mapUrl ?? podMapLink(input.venue);
  if (map) lines.push(`Location: ${map}`);

  lines.push(`Join on Duncit: ${input.url}`);
  return lines.join('\n');
}
