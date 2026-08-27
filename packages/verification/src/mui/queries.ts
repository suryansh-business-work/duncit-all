import { gql } from '@apollo/client';

/**
 * The three server operations behind the verification screen.
 *
 * Held here rather than beside each page so mWeb and the partner console cannot
 * ask for different fields — the drift that made one surface render a reject
 * reason the other had never selected.
 */
export const MY_VERIFICATIONS = gql`
  query MyVerifications {
    myVerifications {
      type
      status
      document_url
      reject_reason
      address {
        line1
        line2
        city
        state
        pincode
        country
      }
    }
  }
`;

/** Submit/replace the IDENTITY document — moves it to Under Review. */
export const SUBMIT_VERIFICATION = gql`
  mutation SubmitVerification($type: VerificationType!, $document_url: String!) {
    submitVerification(type: $type, document_url: $document_url) {
      type
      status
    }
  }
`;

/** Submit the manual residential address — moves ADDRESS to Under Review. */
export const SUBMIT_ADDRESS_VERIFICATION = gql`
  mutation SubmitAddressVerification(
    $line1: String!
    $line2: String
    $city: String!
    $state: String!
    $pincode: String!
    $country: String
  ) {
    submitAddressVerification(
      line1: $line1
      line2: $line2
      city: $city
      state: $state
      pincode: $pincode
      country: $country
    ) {
      type
      status
    }
  }
`;
