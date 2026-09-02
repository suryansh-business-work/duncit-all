import { useQuery } from '@apollo/client/react';
import {
  AUTO_POD_AUDIENCE,
  AUTO_POD_AUDIENCE_ROLES,
  audienceCount,
  type AutoPodAudience,
} from './audience-queries';

export interface AutoPodAudienceState {
  audience: AutoPodAudience | null;
  loading: boolean;
  error: string | null;
  /** Every count is above zero — the only state step 2 opens from. */
  complete: boolean;
}

/**
 * The counts behind step 1. Skipped until a sub-category is chosen, and
 * re-fetched on every change of it: the whole point is to learn, BEFORE the
 * pod is written, whether anyone could enrol in it. Always network-only — a
 * partner onboarded a minute ago must count.
 */
export function useAutoPodAudience(subCategoryId: string, enabled: boolean): AutoPodAudienceState {
  const active = enabled && !!subCategoryId;
  const { data, loading, error } = useQuery<{ autoPodAudience: AutoPodAudience }>(AUTO_POD_AUDIENCE, {
    variables: { sub_category_id: subCategoryId },
    skip: !active,
    fetchPolicy: 'network-only',
  });
  const audience = active ? (data?.autoPodAudience ?? null) : null;
  const complete =
    !!audience && AUTO_POD_AUDIENCE_ROLES.every((role) => audienceCount(audience, role) > 0);
  return { audience, loading: active && loading, error: error?.message ?? null, complete };
}
