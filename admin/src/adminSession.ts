import { gql } from '@apollo/client';

export interface AdminSessionUser {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  phone_extension?: string | null;
  country?: string | null;
  city?: string | null;
  zone?: string | null;
  profile_photo?: string | null;
  bio?: string | null;
  roles?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const ADMIN_ME = gql`
  query AdminMe {
    me {
      user_id
      first_name
      last_name
      full_name
      email
      phone_number
      phone_extension
      country
      city
      zone
      profile_photo
      bio
      roles
      created_at
      updated_at
    }
  }
`;

export const UPDATE_ADMIN_PROFILE = gql`
  mutation UpdateAdminProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      first_name
      last_name
      full_name
      email
      phone_number
      phone_extension
      country
      city
      zone
      profile_photo
      bio
      roles
      updated_at
    }
  }
`;

export function getAdminDisplayName(user?: AdminSessionUser | null) {
  const fullName = user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  return fullName || user?.email || 'Admin';
}

export function getAdminInitials(user?: AdminSessionUser | null) {
  const name = getAdminDisplayName(user);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';
}