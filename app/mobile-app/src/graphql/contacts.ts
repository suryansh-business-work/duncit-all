import { gql } from '@/generated/graphql';

/**
 * Your Contacts on Duncit — RN twins of mWeb's contacts-page/queries.ts.
 *
 * Every selection is written out in full: this app's codegen reads the STRING
 * passed to `gql()` at build time, so an interpolated template would be
 * silently skipped and `gql()` would return nothing at runtime.
 */

/** One page of the viewer's matched contacts, and how many there are in all.
 * Search and the same-city switch run on the device over what has landed. */
export const ContactsOnDuncitPageDocument = gql(`
  query MobileContactsOnDuncitPage($offset: Int, $limit: Int) {
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
`);

/** Whether the viewer has synced yet, plus the viewer for the radar's centre. */
export const MyContactsSyncDocument = gql(`
  query MobileMyContactsSync {
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
`);

/** One slice of a phone book. The first slice omits `batch.sync_id` and every
 * later one passes back the id it was given. */
export const SyncContactsDocument = gql(`
  mutation MobileSyncContacts($entries: [ContactEntryInput!]!, $batch: ContactSyncBatchInput) {
    syncContacts(entries: $entries, batch: $batch) {
      sync_id
    }
  }
`);

/** One page of the phone-book numbers that reached nobody — who an invite is for. */
export const ContactsToInvitePageDocument = gql(`
  query MobileContactsToInvitePage($offset: Int, $limit: Int) {
    contactsToInvitePage(offset: $offset, limit: $limit) {
      total
      rows {
        phone_key
        contact_label
        invited_at
      }
    }
  }
`);

/** Text an invite to one contact or to the ticked ones. `sent_keys` is what the
 * screen marks Invited, rather than re-reading the whole list. */
export const InviteContactsDocument = gql(`
  mutation MobileInviteContacts($phone_keys: [String!]) {
    inviteContacts(phone_keys: $phone_keys) {
      requested
      sent
      skipped
      failed
      sent_keys
    }
  }
`);

export const ClearMyContactsDocument = gql(`
  mutation MobileClearMyContacts {
    clearMyContacts
  }
`);
