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
      phone_number
      phone_extension
      roles
    }
  }
`);

/**
 * Full profile-settings record — the same `me` fields mWeb's AccountPage reads
 * (contact, location, dob, status, plus the whatsapp fields the edit form needs).
 * Powers the mobile Account (Profile Settings) screen.
 */
export const MobileAccountDocument = gql(`
  query MobileAccount {
    me {
      user_id
      first_name
      last_name
      full_name
      email
      phone_number
      phone_extension
      whatsapp_number
      whatsapp_extension
      profile_photo
      bio
      city
      zone
      country
      dob
      roles
      status
      created_at
    }
  }
`);

/** Account health for the signed-in user — mWeb's MY_ACCOUNT_HEALTH. */
export const MobileAccountHealthDocument = gql(`
  query MobileAccountHealth {
    myAccountHealth {
      base_score
      delta_sum
      total_score
      band
      adjustments {
        id
        delta
        remark
        created_by_name
        created_at
      }
    }
  }
`);

/** Update the signed-in user's profile — mWeb's UPDATE_MY_PROFILE. */
export const MobileUpdateProfileDocument = gql(`
  mutation MobileUpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      first_name
      last_name
      full_name
      bio
      city
      zone
      country
      phone_number
      phone_extension
      whatsapp_number
      whatsapp_extension
      profile_photo
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
