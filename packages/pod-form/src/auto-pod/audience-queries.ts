import { gql } from '@apollo/client';

/**
 * Who could enrol in a fresh Auto Pod of one sub-category — the counts step 1
 * of the template gates on, and the rows the drawer behind each count lists.
 * Admin-only on the server: the rows carry partners' contact details.
 */
export const AUTO_POD_AUDIENCE = gql`
  query AutoPodAudience($sub_category_id: ID!) {
    autoPodAudience(sub_category_id: $sub_category_id) {
      venue_count
      host_count
      club_admin_count
      venues {
        id
        venue_name
        city
        locality
        owner_name
      }
      hosts {
        user_id
        full_name
        email
        phone
      }
      club_admins {
        user_id
        full_name
        email
        club_names
      }
    }
  }
`;

// Object types rather than interfaces: the drawer hands each list to a table
// typed over `Record<string, unknown>`, which an interface cannot satisfy.
export type AutoPodAudienceVenue = {
  id: string;
  venue_name: string;
  city: string;
  locality: string;
  owner_name: string;
};

export type AutoPodAudienceHost = {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
};

export type AutoPodAudienceClubAdmin = {
  user_id: string;
  full_name: string;
  email: string;
  club_names: string[];
};

export interface AutoPodAudience {
  venue_count: number;
  host_count: number;
  club_admin_count: number;
  venues: AutoPodAudienceVenue[];
  hosts: AutoPodAudienceHost[];
  club_admins: AutoPodAudienceClubAdmin[];
}

/** The three counts, in the order the cards show them. */
export type AutoPodAudienceRole = 'venues' | 'hosts' | 'club_admins';

export const AUTO_POD_AUDIENCE_ROLES: readonly AutoPodAudienceRole[] = ['venues', 'hosts', 'club_admins'];

/** One role's count off the payload. */
export function audienceCount(audience: AutoPodAudience, role: AutoPodAudienceRole): number {
  if (role === 'venues') return audience.venue_count;
  if (role === 'hosts') return audience.host_count;
  return audience.club_admin_count;
}
