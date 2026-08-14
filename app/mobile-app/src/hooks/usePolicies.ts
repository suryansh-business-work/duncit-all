import { useEffect, useMemo } from 'react';

import {
  usePolicyStore,
  usePublicPoliciesStore,
  useSignupPoliciesStore,
} from '@/stores/policies.store';
import { fireAndForget } from '@/utils/fire-and-forget';

/** Public policy links for the drawer's Policies section. */
export function usePublicPolicies() {
  const data = usePublicPoliciesStore((s) => s.data);
  const isLoading = usePublicPoliciesStore((s) => s.isLoading);
  const fetch = usePublicPoliciesStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading };
}

/**
 * The policies a new account must accept — backs the signup acceptance gate.
 *
 * `loaded` exists because an empty list is vacuously accepted: without it the
 * gate would stand open for the render or two before the server answers, and
 * the submit button would enable itself while the sheet was still empty.
 */
export function useSignupPolicies() {
  const data = useSignupPoliciesStore((s) => s.data);
  const isLoading = useSignupPoliciesStore((s) => s.isLoading);
  const error = useSignupPoliciesStore((s) => s.error);
  const fetch = useSignupPoliciesStore((s) => s.fetch);
  const refetch = useSignupPoliciesStore((s) => s.refetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Memoised so the schema factory that depends on these ids is not rebuilt,
  // and the form not re-validated, on every unrelated render.
  const policies = useMemo(() => data?.signupPolicies ?? [], [data]);

  return { policies, loaded: data !== undefined, isLoading, error, refetch };
}

/** A single policy document by slug — backs the reader screen. */
export function usePolicy(slug: string) {
  const entry = usePolicyStore((s) => s.bySlug[slug]);
  const fetch = usePolicyStore((s) => s.fetch);

  useEffect(() => {
    if (slug) fireAndForget(fetch(slug));
  }, [slug, fetch]);

  return {
    data: entry?.data,
    isLoading: entry?.isLoading ?? !!slug,
    error: entry?.error,
  };
}
