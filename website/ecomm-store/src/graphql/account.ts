import { gql, type TypedDocumentNode } from '@apollo/client';
import { buildMeQuerySource } from '@duncit/user-core';

import type { NoVars } from './types';

export interface AuthPayload {
  token: string;
}

export type LoginChannel = 'EMAIL' | 'PHONE';

/** Where a one-time code goes: an email address, or a number with its dial code. */
export interface LoginContact {
  channel: LoginChannel;
  email?: string;
  phone_extension?: string;
  phone_number?: string;
}

export const LOGIN: TypedDocumentNode<
  { login: AuthPayload },
  { input: { channel: LoginChannel; email: string; password: string } }
> = gql`
  mutation EcommStoreLogin($input: LoginInput!) {
    login(input: $input) {
      token
    }
  }
`;

export const LOGIN_WITH_GOOGLE: TypedDocumentNode<{ loginWithGoogle: AuthPayload }, { input: { id_token: string } }> = gql`
  mutation EcommStoreLoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
    }
  }
`;

export interface LoginOtpRequest {
  ok: boolean;
  registered: boolean;
  sent: boolean;
  resend_after_seconds: number;
  test_code: string | null;
}

export const REQUEST_LOGIN_OTP: TypedDocumentNode<{ requestLoginOtp: LoginOtpRequest }, { input: LoginContact }> = gql`
  mutation EcommStoreRequestLoginOtp($input: RequestLoginOtpInput!) {
    requestLoginOtp(input: $input) {
      ok
      registered
      sent
      resend_after_seconds
      test_code
    }
  }
`;

export const LOGIN_WITH_OTP: TypedDocumentNode<
  { loginWithOtp: AuthPayload },
  { input: LoginContact & { otp: string } }
> = gql`
  mutation EcommStoreLoginWithOtp($input: LoginWithOtpInput!) {
    loginWithOtp(input: $input) {
      token
    }
  }
`;

export interface PetProfile {
  name: string | null;
  species: string | null;
  breed: string | null;
  age: number | null;
  photo_url: string | null;
  bio: string | null;
}

export interface StoreMe {
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  phone_extension: string | null;
  profile_photo: string | null;
  locale: string | null;
  pet_profile: PetProfile | null;
}

/** The shared session selection every surface reads `me` through, plus the pet. */
export const STORE_ME: TypedDocumentNode<{ me: StoreMe | null }, NoVars> = gql(
  buildMeQuerySource('EcommStoreMe', 'pet_profile { name species breed age photo_url bio }'),
);

export const UPDATE_PET_PROFILE: TypedDocumentNode<
  { updateMyPetProfile: { user_id: string; pet_profile: PetProfile | null } },
  { input: Partial<PetProfile> }
> = gql`
  mutation EcommStoreUpdatePetProfile($input: PetProfileInput!) {
    updateMyPetProfile(input: $input) {
      user_id
      pet_profile {
        name
        species
        breed
        age
        photo_url
        bio
      }
    }
  }
`;

export interface UserAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

export type UserAddressInput = Omit<UserAddress, 'id' | 'is_default'> & { is_default?: boolean };

const ADDRESS_FIELDS = `
  id
  label
  name
  phone
  email
  line1
  line2
  landmark
  city
  state
  pincode
  country
  is_default
`;

export const MY_ADDRESSES: TypedDocumentNode<{ myAddresses: UserAddress[] }, NoVars> = gql`
  query EcommStoreMyAddresses {
    myAddresses { ${ADDRESS_FIELDS} }
  }
`;

export const SAVE_ADDRESS: TypedDocumentNode<
  { saveMyAddress: UserAddress },
  { id?: string | null; input: UserAddressInput }
> = gql`
  mutation EcommStoreSaveAddress($id: ID, $input: UserAddressInput!) {
    saveMyAddress(id: $id, input: $input) { ${ADDRESS_FIELDS} }
  }
`;

export const DELETE_ADDRESS: TypedDocumentNode<{ deleteMyAddress: boolean }, { id: string }> = gql`
  mutation EcommStoreDeleteAddress($id: ID!) {
    deleteMyAddress(id: $id)
  }
`;

export const SET_DEFAULT_ADDRESS: TypedDocumentNode<{ setDefaultMyAddress: UserAddress }, { id: string }> = gql`
  mutation EcommStoreSetDefaultAddress($id: ID!) {
    setDefaultMyAddress(id: $id) { ${ADDRESS_FIELDS} }
  }
`;

export const MY_COIN_BALANCE: TypedDocumentNode<{ myCoinBalance: { balance: number } }, NoVars> = gql`
  query EcommStoreCoinBalance {
    myCoinBalance {
      balance
    }
  }
`;

export const REDEEM_GIFT_CARD: TypedDocumentNode<
  { redeemGiftCard: { coins_added: number; coin_balance: number } },
  { code: string }
> = gql`
  mutation EcommStoreRedeemGiftCard($code: String!) {
    redeemGiftCard(code: $code) {
      coins_added
      coin_balance
    }
  }
`;

export interface NewsletterInput {
  email: string;
  source: 'WEBSITE_FOOTER' | 'WEBSITE_PAGE';
  captcha_token?: string;
  captcha_answer?: string;
}

export const SUBSCRIBE_NEWSLETTER: TypedDocumentNode<
  { subscribeNewsletter: { ok: boolean; message: string } },
  { input: NewsletterInput }
> = gql`
  mutation EcommStoreSubscribeNewsletter($input: SubscribeNewsletterInput!) {
    subscribeNewsletter(input: $input) {
      ok
      message
    }
  }
`;
