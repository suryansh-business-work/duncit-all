import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  MutationRequestVenueKitEmailOtpArgs,
  MutationRequestVenueKitPhoneOtpArgs,
  MutationSetVenueKitInterestStatusArgs,
  MutationSubmitVenueKitInterestArgs,
  MutationUpdateVenueKitOfferArgs,
  MutationVerifyVenueKitEmailOtpArgs,
  MutationVerifyVenueKitPhoneOtpArgs,
  VenueKitInterest,
  VenueKitInterestSummary,
  VenueKitOffer,
  VenueKitOtpProof,
  VenueKitOtpRequest,
  VenueKitSubmitResult,
} from '@duncit/gql-types';

export type OfferData = Omit<VenueKitOffer, '__typename'>;
export type CodeRequest = Pick<VenueKitOtpRequest, 'expires_in_minutes' | 'sent' | 'test_code'>;
export type InterestRow = Omit<VenueKitInterest, '__typename'>;

export const VENUE_KIT_OFFER: TypedDocumentNode<{ venueKitOffer: OfferData }> = gql`
  query VenueKitOffer {
    venueKitOffer {
      annual_price_paise
      included_table_labels
      extra_label_price_paise
      pos_activation_months
      gift_card_count
      gift_card_value_paise
      collab_gift_card_discount_pct
      order_benefit_pct
      updated_at
    }
  }
`;

export const UPDATE_VENUE_KIT_OFFER: TypedDocumentNode<{ updateVenueKitOffer: OfferData }, MutationUpdateVenueKitOfferArgs> = gql`
  mutation UpdateVenueKitOffer($input: VenueKitOfferInput!) {
    updateVenueKitOffer(input: $input) {
      annual_price_paise
      included_table_labels
      extra_label_price_paise
      pos_activation_months
      gift_card_count
      gift_card_value_paise
      collab_gift_card_discount_pct
      order_benefit_pct
      updated_at
    }
  }
`;

export const VENUE_KIT_SUMMARY: TypedDocumentNode<{ venueKitInterestSummary: VenueKitInterestSummary }> = gql`
  query VenueKitInterestSummary {
    venueKitInterestSummary {
      total
      phone_verified
      by_status {
        status
        count
      }
    }
  }
`;

export const VENUE_KIT_INTERESTS_TABLE = gql`
  query VenueKitInterestsTable($query: TableQueryInput) {
    venueKitInterestsTable(query: $query) {
      total
      rows {
        id
        name
        email
        email_verified_at
        phone_extension
        phone_number
        phone_verified
        phone_verified_at
        source
        status
        note
        submission_count
        last_submitted_at
        created_at
      }
    }
  }
`;

export const SET_VENUE_KIT_INTEREST_STATUS: TypedDocumentNode<
  { setVenueKitInterestStatus: Pick<VenueKitInterest, 'id' | 'status'> },
  MutationSetVenueKitInterestStatusArgs
> = gql`
  mutation SetVenueKitInterestStatus($input: VenueKitInterestStatusInput!) {
    setVenueKitInterestStatus(input: $input) {
      id
      status
    }
  }
`;

export const REQUEST_EMAIL_CODE: TypedDocumentNode<{ requestVenueKitEmailOtp: CodeRequest }, MutationRequestVenueKitEmailOtpArgs> = gql`
  mutation ConsoleVenueKitEmailOtp($input: VenueKitEmailOtpInput!) {
    requestVenueKitEmailOtp(input: $input) {
      expires_in_minutes
      sent
      test_code
    }
  }
`;

export const VERIFY_EMAIL_CODE: TypedDocumentNode<{ verifyVenueKitEmailOtp: VenueKitOtpProof }, MutationVerifyVenueKitEmailOtpArgs> = gql`
  mutation ConsoleVenueKitVerifyEmail($input: VenueKitEmailVerifyInput!) {
    verifyVenueKitEmailOtp(input: $input) {
      token
    }
  }
`;

export const REQUEST_PHONE_CODE: TypedDocumentNode<{ requestVenueKitPhoneOtp: CodeRequest }, MutationRequestVenueKitPhoneOtpArgs> = gql`
  mutation ConsoleVenueKitPhoneOtp($input: VenueKitPhoneOtpInput!) {
    requestVenueKitPhoneOtp(input: $input) {
      expires_in_minutes
      sent
      test_code
    }
  }
`;

export const VERIFY_PHONE_CODE: TypedDocumentNode<{ verifyVenueKitPhoneOtp: VenueKitOtpProof }, MutationVerifyVenueKitPhoneOtpArgs> = gql`
  mutation ConsoleVenueKitVerifyPhone($input: VenueKitPhoneVerifyInput!) {
    verifyVenueKitPhoneOtp(input: $input) {
      token
    }
  }
`;

export const SUBMIT_INTEREST: TypedDocumentNode<
  { submitVenueKitInterest: Pick<VenueKitSubmitResult, 'ok' | 'already_registered'> },
  MutationSubmitVenueKitInterestArgs
> = gql`
  mutation ConsoleVenueKitSubmit($input: VenueKitInterestInput!) {
    submitVenueKitInterest(input: $input) {
      ok
      already_registered
    }
  }
`;
