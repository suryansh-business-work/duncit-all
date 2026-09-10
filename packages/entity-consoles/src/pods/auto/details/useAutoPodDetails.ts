import { useQuery } from '@apollo/client/react';
import {
  ADMIN_AUTO_POD_DETAILS,
  AUTO_POD_AUDIENCE_COUNTS,
  type AutoPodAudienceCounts,
  type AutoPodDetailsRow,
} from '../queries';

interface DetailsData {
  autoPod: AutoPodDetailsRow | null;
}

interface AudienceData {
  autoPodAudience: AutoPodAudienceCounts;
}

/**
 * What the offer's own page reads: the staging record itself, and — once its
 * category is known — how many venues, hosts and club admins could still
 * enrol in it. The counts are a second query on purpose: they are per
 * CATEGORY, not per offer, and a page that has not resolved its category yet
 * has nothing to count.
 */
export function useAutoPodDetails(autoPodDocId: string) {
  const details = useQuery<DetailsData>(ADMIN_AUTO_POD_DETAILS, {
    variables: { auto_pod_doc_id: autoPodDocId },
    skip: !autoPodDocId,
    fetchPolicy: 'cache-and-network',
  });
  const row = details.data?.autoPod ?? null;

  const audience = useQuery<AudienceData>(AUTO_POD_AUDIENCE_COUNTS, {
    variables: { sub_category_id: row?.sub_category_id ?? '' },
    skip: !row?.sub_category_id,
    fetchPolicy: 'cache-first',
  });

  return {
    row,
    loading: details.loading && !row,
    error: details.error,
    counts: audience.data?.autoPodAudience ?? null,
    refetch: () => {
      details.refetch().catch(() => undefined);
    },
  };
}
