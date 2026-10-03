import { gql, type TypedDocumentNode } from '@apollo/client';

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
  two_factor_enabled: boolean;
  two_factor_enabled_at: string | null;
  two_factor_recovery_codes_left: number;
}

/** The secret to put into an authenticator app, as a QR code and as text. */
export interface TwoFactorSetup {
  secret: string;
  qr_code_data_url: string;
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
      two_factor_enabled
      two_factor_enabled_at
      two_factor_recovery_codes_left
      google {
        google_email
        linked_at
      }
    }
  }
`;

/*
  The two-factor mutations select only what the screen reads off them.
  ConnectedAccounts has no id, so Apollo cannot merge an answer into the query
  above — the Security tab refetches it after a change instead, as it does
  after a password change.
*/
export const START_TWO_FACTOR_SETUP: TypedDocumentNode<
  { startTwoFactorSetup: TwoFactorSetup },
  Record<string, never>
> = gql`
  mutation ShellStartTwoFactorSetup {
    startTwoFactorSetup {
      secret
      qr_code_data_url
    }
  }
`;

export const ENABLE_TWO_FACTOR: TypedDocumentNode<
  { enableTwoFactor: { recovery_codes: string[] } },
  { code: string }
> = gql`
  mutation ShellEnableTwoFactor($code: String!) {
    enableTwoFactor(code: $code) {
      recovery_codes
    }
  }
`;

export const DISABLE_TWO_FACTOR: TypedDocumentNode<
  { disableTwoFactor: { two_factor_enabled: boolean } },
  { code: string }
> = gql`
  mutation ShellDisableTwoFactor($code: String!) {
    disableTwoFactor(code: $code) {
      two_factor_enabled
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
