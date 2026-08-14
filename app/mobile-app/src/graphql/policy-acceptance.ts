import { gql } from '@/generated/graphql';

/**
 * The policies a new account must accept, in display order.
 *
 * Public and unauthenticated, because the surface that asks — the signup form,
 * and the same dialog after Google returns — has no session yet.
 *
 * `content` rides along with the list on purpose: the Policy reader screen is
 * registered in the signed-in stack, so nobody standing at this gate can
 * navigate to it. The sheet renders the body itself from what this returns.
 */
export const MobileSignupPoliciesDocument = gql(`
  query MobileSignupPolicies {
    signupPolicies {
      id
      slug
      title
      content
    }
  }
`);
