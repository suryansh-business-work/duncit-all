import type { NavigateFunction } from 'react-router';
import { apolloClient } from '../apollo';
import { POD_ID_BY_SLUGS } from '../pages/pod-details-page/queries';
import { podUrl } from '../utils/seoUrls';

export interface PodLink {
  id?: string | null;
  pod_id?: string | null;
  club_slug?: string | null;
}

/**
 * Open a pod's details page from a card that already holds the pod.
 *
 * The page is addressed by slugs, so on arrival it first asks the server which
 * pod they name, and only then asks for the pod — a full round trip the card
 * could have answered. Writing that answer into the cache lets the page's slug
 * lookup (cache-and-network) hand over the id at once, so the details query
 * starts immediately; the lookup still re-checks with the server behind it.
 */
export function openPod(navigate: NavigateFunction, pod: Readonly<PodLink>): void {
  const { id, pod_id: podSlug, club_slug: clubSlug } = pod;
  if (id && podSlug && clubSlug) {
    apolloClient.writeQuery({
      query: POD_ID_BY_SLUGS,
      variables: { clubSlug, podSlug },
      data: { podBySlugs: { __typename: 'Pod', id, pod_id: podSlug, club_slug: clubSlug } },
    });
  }
  navigate(podUrl(clubSlug, podSlug));
}
