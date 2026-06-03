import { useEffect } from 'react';

import { usePolicyStore, usePublicPoliciesStore } from '@/stores/policies.store';

/** Public policy links for the drawer's Policies section. */
export function usePublicPolicies() {
  const data = usePublicPoliciesStore((s) => s.data);
  const isLoading = usePublicPoliciesStore((s) => s.isLoading);
  const fetch = usePublicPoliciesStore((s) => s.fetch);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { data, isLoading };
}

/** A single policy document by slug — backs the reader screen. */
export function usePolicy(slug: string) {
  const entry = usePolicyStore((s) => s.bySlug[slug]);
  const fetch = usePolicyStore((s) => s.fetch);

  useEffect(() => {
    if (slug) void fetch(slug);
  }, [slug, fetch]);

  return {
    data: entry?.data,
    isLoading: entry?.isLoading ?? !!slug,
    error: entry?.error,
  };
}
