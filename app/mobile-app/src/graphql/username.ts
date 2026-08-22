import { gql } from '@/generated/graphql';

/**
 * The @handle a profile is shared as — the native twin of mWeb's
 * `account-page/username-form/queries.ts` (rule 27).
 *
 * The availability query is fired from a debounced field, so it is deliberately
 * a thin selection: a keystroke must not drag the whole user record with it.
 */

export const MobileUsernameAvailabilityDocument = gql(`
  query MobileUsernameAvailability($username: String!) {
    usernameAvailability(username: $username) {
      username
      available
      reason
    }
  }
`);

export const MobileSetUsernameDocument = gql(`
  mutation MobileSetUsername($username: String!) {
    setMyUsername(username: $username) {
      user_id
      username
    }
  }
`);
