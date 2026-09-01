import { useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

/** One policy the gate lists. Title and body are API data, never translation keys. */
export interface SignupPolicy {
  id: string;
  slug: string;
  title: string;
  content: string;
}

const SIGNUP_POLICIES = gql`
  query SignupPolicies {
    signupPolicies {
      id
      slug
      title
      content
    }
  }
`;

// A fresh array on every render would rebuild the Zod schema on every keystroke,
// because the schema closes over the required-id list.
const NO_POLICIES: SignupPolicy[] = [];

/**
 * The policies a new account has to accept.
 *
 * Public and argument-free, so the register form and the post-Google gate both
 * call it and share one Apollo cache entry instead of drilling the list through
 * the page. The body comes down with the list rather than being fetched when a
 * row is opened: the reader is not signed in yet and `/policies/:slug` sits
 * behind RequireAuth, so sending them there would bounce them to the login
 * screen and lose the half-filled signup form.
 */
export function useSignupPolicies() {
  const { data, loading, error } = useQuery<any>(SIGNUP_POLICIES);
  const policies = useMemo<SignupPolicy[]>(() => data?.signupPolicies ?? NO_POLICIES, [data]);
  return { policies, loading, failed: !!error };
}
