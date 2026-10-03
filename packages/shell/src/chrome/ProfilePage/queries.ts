import { gql } from '@apollo/client';

/** One link on the profile — a website or social account. */
export interface ProfileLink {
  label: string;
  url: string;
}

/** The editable profile fields the session user does not already carry. */
export interface ProfileDetails {
  user_id: string;
  bio: string | null;
  profile_links: ProfileLink[];
  profile_visibility: 'PUBLIC' | 'PRIVATE' | null;
}

/** What the account can sign in with, and when it last did. */
export interface ConnectedAccounts {
  has_password: boolean;
  google: { google_email: string; linked_at: string | null } | null;
  password_changed_at: string | null;
  last_login_at: string | null;
  last_login_provider: string | null;
}

export const MY_PROFILE_DETAILS = gql`
  query ShellMyProfileDetails {
    me {
      user_id
      bio
      profile_visibility
      profile_links {
        label
        url
      }
    }
  }
`;

export const UPDATE_MY_PROFILE = gql`
  mutation ShellUpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      first_name
      last_name
      full_name
      email
      profile_photo
      roles
      bio
      profile_links {
        label
        url
      }
    }
  }
`;

export const SET_PROFILE_VISIBILITY = gql`
  mutation ShellSetProfileVisibility($visibility: ProfileVisibility!) {
    updateMyProfileVisibility(visibility: $visibility) {
      user_id
      profile_visibility
    }
  }
`;

/** The signed-in account's sign-in methods and history. Its own query because
 * the password hash it reports on is select:false and so invisible to the user
 * mapper the shell's session already holds. */
export const MY_CONNECTED_ACCOUNTS = gql`
  query ShellMyConnectedAccounts {
    myConnectedAccounts {
      has_password
      password_changed_at
      last_login_at
      last_login_provider
      google {
        google_email
        linked_at
      }
    }
  }
`;

export const REQUEST_PASSWORD_CHANGE_OTP = gql`
  mutation ShellRequestPasswordChangeOtp($input: RequestPasswordChangeInput!) {
    requestPasswordChangeOtp(input: $input) {
      ok
    }
  }
`;

export const CHANGE_PASSWORD_WITH_OTP = gql`
  mutation ShellChangePasswordWithOtp($input: ChangePasswordInput!) {
    changePasswordWithOtp(input: $input)
  }
`;

export const SIGN_OUT_EVERYWHERE = gql`
  mutation ShellSignOutEverywhere {
    signOutEverywhere
  }
`;
