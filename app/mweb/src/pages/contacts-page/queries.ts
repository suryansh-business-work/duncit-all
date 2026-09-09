import { gql } from '@apollo/client';
import type { Person } from '../../components/FollowListDialog/FollowRow';

/** One matched contact as `contactsOnDuncit` returns it. Twin of native
 * `ContactsOnDuncitDocument` (rule 27). */
export interface ContactRow {
  contact_label: string;
  is_nearby: boolean;
  profile: Person & { city?: string | null };
}

export interface ContactsSyncStatus {
  synced_at: string;
  submitted: number;
  matched: number;
  invitable: number;
}

export const CONTACTS_ON_DUNCIT = gql`
  query ContactsOnDuncit($search: String, $nearby: Boolean) {
    contactsOnDuncit(search: $search, nearby: $nearby) {
      contact_label
      is_nearby
      profile {
        user_id
        username
        full_name
        first_name
        profile_photo
        city
        is_following
        follow_status
        follows_viewer
      }
    }
  }
`;

export const MY_CONTACTS_SYNC = gql`
  query MyContactsSync {
    myContactsSync {
      synced_at
      submitted
      matched
      invitable
    }
    me {
      user_id
      full_name
      first_name
      profile_photo
    }
  }
`;

export const SYNC_CONTACTS = gql`
  mutation SyncContacts($entries: [ContactEntryInput!]!) {
    syncContacts(entries: $entries) {
      submitted
      matched
      invitable
      new_matches
      synced_at
    }
  }
`;

export const CLEAR_MY_CONTACTS = gql`
  mutation ClearMyContacts {
    clearMyContacts
  }
`;

/** One contact who is not on Duncit yet. Twin of native
 * `ContactsToInviteDocument` (rule 27). */
export interface InviteRow {
  phone_key: string;
  contact_label: string;
  invited_at: string | null;
}

export const CONTACTS_TO_INVITE = gql`
  query ContactsToInvite($search: String) {
    contactsToInvite(search: $search) {
      phone_key
      contact_label
      invited_at
    }
  }
`;

export const INVITE_CONTACTS = gql`
  mutation InviteContacts($phone_keys: [String!]) {
    inviteContacts(phone_keys: $phone_keys) {
      requested
      sent
      skipped
      failed
    }
  }
`;
