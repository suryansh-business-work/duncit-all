import { gql } from '@apollo/client';

/**
 * The public host page's profile — `/hosts/:handle` carries the @username or
 * a user id, and `publicUserProfile` resolves both, signed out too. Only what
 * the page shows: none of the follow / viewer fields the member profile reads.
 */
export const HOST_PAGE_PROFILE = gql`
  query HostPageProfile($handle: ID!) {
    publicUserProfile(user_id: $handle) {
      user_id
      username
      full_name
      first_name
      last_name
      profile_photo
      bio
      city
      is_host
    }
  }
`;

export interface HostPageProfile {
  user_id: string;
  username: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_photo: string | null;
  bio: string | null;
  city: string | null;
  is_host: boolean;
}

/** The name the page leads with: the full name, else first + last, else the handle. */
export function hostDisplayName(host: HostPageProfile): string {
  const joined = [host.first_name, host.last_name].filter(Boolean).join(' ');
  return host.full_name?.trim() || joined || host.username;
}
