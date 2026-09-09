import { gql } from '@/generated/graphql';

/**
 * Your Contacts on Duncit — RN twins of mWeb's contacts-page/queries.ts.
 *
 * Every selection is written out in full: this app's codegen reads the STRING
 * passed to `gql()` at build time, so an interpolated template would be
 * silently skipped and `gql()` would return nothing at runtime.
 */

/** The viewer's matched contacts, filtered server-side by name and city. */
export const ContactsOnDuncitDocument = gql(`
  query MobileContactsOnDuncit($search: String, $nearby: Boolean) {
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

export const SyncContactsDocument = gql(`
  mutation MobileSyncContacts($entries: [ContactEntryInput!]!) {
    syncContacts(entries: $entries) {
      submitted
      matched
      new_matches
      invitable
      synced_at
    }
  }
`);

/** The phone-book numbers that reached nobody — who an invite is for. */
export const ContactsToInviteDocument = gql(`
  query MobileContactsToInvite($search: String) {
    contactsToInvite(search: $search) {
      phone_key
      contact_label
      invited_at
    }
  }
`);

/** Text an invite to one contact, to the ticked ones, or to everyone still
 * waiting — an empty list means everyone. */
export const InviteContactsDocument = gql(`
  mutation MobileInviteContacts($phone_keys: [String!]) {
    inviteContacts(phone_keys: $phone_keys) {
      requested
      sent
      skipped
      failed
    }
  }
`);

export const ClearMyContactsDocument = gql(`
  mutation MobileClearMyContacts {
    clearMyContacts
  }
`);
