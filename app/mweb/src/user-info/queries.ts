import { gql, type TypedDocumentNode } from '@apollo/client';
import type { CoinBalance } from '../pages/duncit-coin-page/queries';

/**
 * Everything the signed-in shell knows about its account, in ONE request: the
 * complete profile, the coin balance and the menu's policy links.
 *
 * It is asked from the network exactly when that knowledge can have moved on
 * this device — sign-in, sign-up, a page load, and a profile save — and every
 * other reader (header, menu, Home, checkout, the account page) answers from
 * the cache it wrote. Before this, each of those asked `me` for itself, and the
 * menu re-read the account and the balance every time it opened.
 *
 * The balance rides here because the menu shows it; it is re-read on its own
 * (`refreshCoinBalance`) after the actions that move it. The native twin is
 * `MobileUserInfo` in app/mobile-app/src/graphql/account.ts (rule 27).
 */
export const USER_INFO: TypedDocumentNode<UserInfoData> = gql`
  query UserInfo {
    me {
      user_id
      username
      first_name
      last_name
      full_name
      email
      phone_number
      phone_extension
      whatsapp_number
      whatsapp_extension
      whatsapp_verified_at
      profile_photo
      bio
      gender
      is_pet_owner
      dob
      roles
      locale
      timezone
      country
      city
      state
      zone
      assigned_city
      assigned_zones
      selected_location_id
      is_email_verified
      is_phone_verified
      onboarding_survey_completed
      profile_visibility
      created_at
      updated_at
      address {
        line1
        line2
        landmark
        city
        state
        pincode
        country
      }
      saved_pod_ids
      following_club_ids
      following_user_ids
    }
    myCoinBalance {
      balance
      lifetime_earned
      earn_pct
      shop_earn_pct
      pod_feedback_coins
    }
    publicPolicies {
      id
      slug
      title
    }
  }
`;

export interface UserInfoAddress {
  line1?: string | null;
  line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
}

export interface UserInfoMe {
  user_id: string;
  username?: string | null;
  first_name: string;
  last_name: string;
  full_name?: string | null;
  email?: string | null;
  phone_number: string;
  phone_extension: string;
  whatsapp_number?: string | null;
  whatsapp_extension?: string | null;
  whatsapp_verified_at?: string | null;
  profile_photo?: string | null;
  bio?: string | null;
  gender?: string | null;
  is_pet_owner?: boolean | null;
  dob: string;
  roles: string[];
  locale?: string | null;
  timezone?: string | null;
  country: string;
  city?: string | null;
  state?: string | null;
  zone?: string | null;
  assigned_city?: string | null;
  assigned_zones?: string[] | null;
  selected_location_id?: string | null;
  is_email_verified?: boolean | null;
  is_phone_verified?: boolean | null;
  onboarding_survey_completed: boolean;
  profile_visibility?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  address: UserInfoAddress;
  saved_pod_ids: string[];
  following_club_ids: string[];
  following_user_ids: string[];
}

export interface UserInfoPolicy {
  id: string;
  slug: string;
  title: string;
}

export interface UserInfoData {
  me: UserInfoMe | null;
  myCoinBalance: CoinBalance;
  publicPolicies: UserInfoPolicy[];
}
