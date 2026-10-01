import { gql } from '@apollo/client';

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
    }
  }
`;

/** The signed-in account's linked Gmail, if any. Its own query because the
 * password hash it reports on is select:false and so invisible to the user
 * mapper the shell's session already holds. */
export const MY_CONNECTED_ACCOUNTS = gql`
  query ShellMyConnectedAccounts {
    myConnectedAccounts {
      google {
        google_email
      }
    }
  }
`;
