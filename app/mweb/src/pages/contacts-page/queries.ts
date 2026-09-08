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
