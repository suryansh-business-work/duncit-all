import { gql } from '@apollo/client';

/** What the signed-in account can sign in with. `has_password` is what decides
 * whether Google may be disconnected — see the schema note. */
export const MY_CONNECTED_ACCOUNTS = gql`
  query MyConnectedAccounts {
    myConnectedAccounts {
      email
      has_password
      google {
        google_email
        linked_at
      }
    }
  }
`;

export const CONNECT_GOOGLE_ACCOUNT = gql`
  mutation ConnectGoogleAccount($input: GoogleAuthInput!) {
    connectGoogleAccount(input: $input) {
      email
      has_password
      google {
        google_email
        linked_at
      }
    }
  }
`;

export const DISCONNECT_GOOGLE_ACCOUNT = gql`
  mutation DisconnectGoogleAccount {
    disconnectGoogleAccount {
      email
      has_password
      google {
        google_email
        linked_at
      }
    }
  }
`;

export interface ConnectedAccounts {
  email: string | null;
  has_password: boolean;
  google: { google_email: string; linked_at: string | null } | null;
}
