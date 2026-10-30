import { gql, type TypedDocumentNode } from '@apollo/client';
import type { LinkPreview, QueryLinkPreviewArgs } from '@duncit/gql-types';

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

export const LOGIN_GOOGLE = gql`
  mutation LoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

/** The "allow" half of the consent step: grants Google sign-in to an existing
 * email/password account and returns the same session a login would have. Sent
 * with the SAME id_token loginWithGoogle just rejected. */
export const LINK_GOOGLE_ACCOUNT = gql`
  mutation LinkGoogleAccount($input: GoogleAuthInput!) {
    linkGoogleAccount(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

/** Sign in with Apple — the same answers as LOGIN_GOOGLE, from the Apple door. */
export const LOGIN_APPLE = gql`
  mutation LoginWithApple($input: AppleAuthInput!) {
    loginWithApple(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

/** The Apple half of the consent step, sent with the id_token loginWithApple refused. */
export const LINK_APPLE_ACCOUNT = gql`
  mutation LinkAppleAccount($input: AppleAuthInput!) {
    linkAppleAccount(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

/** Continue with OTP, step one — send a sign-in code to the chosen channel. */
export const REQUEST_LOGIN_OTP = gql`
  mutation RequestLoginOtp($input: RequestLoginOtpInput!) {
    requestLoginOtp(input: $input) {
      ok
      registered
      channel
      expires_at
      resend_after_seconds
      expires_in_minutes
      sent
      test_code
    }
  }
`;

/** Step two — trade a correct code for the same session a password produces. */
export const LOGIN_WITH_OTP = gql`
  mutation LoginWithOtp($input: LoginWithOtpInput!) {
    loginWithOtp(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

/**
 * The pod a signed-out visitor was heading to (a website's pod rail, a shared
 * link) — the public card slice only, so the login screen can show it on top.
 */
export const LOGIN_POD_PREVIEW: TypedDocumentNode<
  { linkPreview: Pick<LinkPreview, 'title' | 'image_url'> | null },
  QueryLinkPreviewArgs
> = gql`
  query LoginPodPreview($kind: LinkPreviewKind!, $id: String!, $secondary_id: String) {
    linkPreview(kind: $kind, id: $id, secondary_id: $secondary_id) {
      title
      image_url
    }
  }
`;
