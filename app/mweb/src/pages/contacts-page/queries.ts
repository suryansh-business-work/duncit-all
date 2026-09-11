import { gql } from '@apollo/client';
import type { Person } from '../../components/FollowListDialog/FollowRow';

/** One matched contact as `contactsOnDuncitPage` returns it. Twin of native
 * `ContactsOnDuncitPageDocument` (rule 27). */
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

/** One page of the viewer's matched contacts, and how many there are in all.
 * Search and the same-city switch run in the browser over what has landed. */
export const CONTACTS_ON_DUNCIT_PAGE = gql`
  query ContactsOnDuncitPage($offset: Int, $limit: Int) {
    contactsOnDuncitPage(offset: $offset, limit: $limit) {
      total
      rows {
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

/** One slice of a phone book. The first slice omits `batch.sync_id` and every
 * later one passes back the id it was given. */
export const SYNC_CONTACTS = gql`
  mutation SyncContacts($entries: [ContactEntryInput!]!, $batch: ContactSyncBatchInput) {
    syncContacts(entries: $entries, batch: $batch) {
      sync_id
    }
  }
`;

export const CLEAR_MY_CONTACTS = gql`
  mutation ClearMyContacts {
    clearMyContacts
  }
`;

/** One page of the phone-book numbers that reached nobody. Twin of native
 * `ContactsToInvitePageDocument` (rule 27). */
export const CONTACTS_TO_INVITE_PAGE = gql`
  query ContactsToInvitePage($offset: Int, $limit: Int) {
    contactsToInvitePage(offset: $offset, limit: $limit) {
      total
      rows {
        phone_key
        contact_label
        invited_at
      }
    }
  }
`;

/** `sent_keys` is what the page marks Invited, rather than re-reading the list. */
export const INVITE_CONTACTS = gql`
  mutation InviteContacts($phone_keys: [String!]) {
    inviteContacts(phone_keys: $phone_keys) {
      requested
      sent
      skipped
      failed
      sent_keys
    }
  }
`;
