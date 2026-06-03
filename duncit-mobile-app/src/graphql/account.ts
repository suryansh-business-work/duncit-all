import { gql } from '@/generated/graphql';

/**
 * Current user for the account drawer — the same `me` fields mWeb's header
 * reads (name, email, photo, roles) so the mobile sidebar shows identical
 * identity + role chips. Typed via codegen (rule 13).
 */
export const MobileMeDocument = gql(`
  query MobileMe {
    me {
      user_id
      full_name
      first_name
      email
      is_email_verified
      profile_photo
      roles
    }
  }
`);

/** Role key → display name map, shared with mWeb's <UserSummary/> chips. */
export const MobileRolesDocument = gql(`
  query MobilePublicRoles {
    publicRoles {
      key
      name
    }
  }
`);

/** Public policy links for the drawer's collapsible Policies section. */
export const MobilePublicPoliciesDocument = gql(`
  query MobilePublicPolicies {
    publicPolicies {
      id
      slug
      title
    }
  }
`);

/** A single policy by slug — backs the /policies/[slug] reader screen. */
export const MobilePolicyBySlugDocument = gql(`
  query MobilePolicyBySlug($slug: String!) {
    policyBySlug(slug: $slug) {
      id
      slug
      title
      content
    }
  }
`);
