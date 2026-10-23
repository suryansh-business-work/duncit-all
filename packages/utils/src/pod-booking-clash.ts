/**
 * Time clash before a booking — shared by mWeb and the native app.
 *
 * The server answers which of the member's JOINED pods overlap the pod(s) they
 * are about to book (`myBookingClashes`); both apps show that list and let the
 * member free a spot first, force the booking, or cancel it.
 */

/** mWeb wraps it with `gql`; native re-declares it for codegen. */
export const MY_BOOKING_CLASHES_SDL = `
  query MyBookingClashes($pod_doc_ids: [ID!]!) {
    myBookingClashes(pod_doc_ids: $pod_doc_ids) {
      target_pod_id
      pod_id
      pod_slug
      club_slug
      pod_title
      pod_date_time
      pod_end_date_time
    }
  }
`;

export interface PodBookingClash {
  target_pod_id: string;
  pod_id: string;
  pod_slug: string;
  club_slug: string;
  pod_title: string;
  pod_date_time: string;
  pod_end_date_time: string;
}

/** Each clashing pod once, earliest first. */
export function uniqueClashingPods<T extends Pick<PodBookingClash, 'pod_id' | 'pod_date_time'>>(clashes: readonly T[]): T[] {
  const seen = new Map<string, T>();
  for (const clash of clashes) if (!seen.has(clash.pod_id)) seen.set(clash.pod_id, clash);
  return [...seen.values()].sort((a, b) => Date.parse(a.pod_date_time) - Date.parse(b.pod_date_time));
}
