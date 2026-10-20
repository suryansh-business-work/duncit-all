import gql from 'graphql-tag';

export const truecallerTypeDefs = gql`
  "Which Truecaller door the verification came through."
  enum TruecallerPlatform {
    ANDROID
    IOS
    WEB
  }

  "Which screen started a mobile-web Truecaller request — only its wording differs."
  enum TruecallerIntent {
    LOGIN
    SIGNUP
  }

  enum TruecallerAuthStatus {
    "The number belongs to an account; auth holds its session."
    SIGNED_IN
    "Nobody has this number yet; signup holds the proof that replaces the WhatsApp code."
    SIGNUP_REQUIRED
  }

  enum TruecallerWebState {
    PENDING
    READY
    REJECTED
    USED
    EXPIRED
  }

  """
  What a Truecaller SDK handed the app. Android sends authorization_code +
  code_verifier, iOS the signed payload + signature + signature_algorithm,
  mobile web only the request_nonce it started with. The server re-checks each
  with Truecaller; nothing else the client knows about the person is read.
  """
  input TruecallerAuthInput {
    platform: TruecallerPlatform!
    authorization_code: String
    code_verifier: String
    payload: String
    signature: String
    signature_algorithm: String
    request_nonce: String
  }

  "A Truecaller-verified number on its way to signup, with the name Truecaller holds for it."
  type TruecallerSignupProof {
    "Spent by register / signupWithGoogle / signupWithApple exactly like a WhatsApp code's token."
    whatsapp_token: String!
    phone_extension: String!
    phone_number: String!
    first_name: String!
    last_name: String!
    "Blank when Truecaller has none. A suggestion for the form, never treated as verified."
    email: String!
  }

  type TruecallerAuthResult {
    status: TruecallerAuthStatus!
    auth: AuthPayload
    signup: TruecallerSignupProof
  }

  type TruecallerWebRequest {
    request_nonce: String!
    "Open this on an Android browser; Truecaller's sheet appears when the app is installed."
    deep_link: String!
  }

  extend type Query {
    "Mobile web: has Truecaller answered the request this page started? Public."
    truecallerWebState(request_nonce: String!): TruecallerWebState!
  }

  extend type Mutation {
    "Mobile web: mint the nonce Truecaller will post this person's token against. Public."
    startTruecallerWebLogin(intent: TruecallerIntent!, lang: String): TruecallerWebRequest!
    """
    Continue with Truecaller from login or signup. A known number signs in; an
    unknown one comes back with the proof that lets signup skip the WhatsApp code.
    """
    loginWithTruecaller(input: TruecallerAuthInput!): TruecallerAuthResult!
  }
`;
