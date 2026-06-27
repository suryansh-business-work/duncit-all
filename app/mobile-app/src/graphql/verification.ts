import { gql } from '@/generated/graphql';

/** The signed-in user's 3 verification types + status (Identity / Address / Email). */
export const MyVerificationsDocument = gql(`
  query MobileMyVerifications {
    myVerifications {
      type
      status
      document_url
      address {
        line1
        line2
        city
        state
        pincode
        country
      }
      reject_reason
    }
  }
`);

/** Submit/replace an IDENTITY document — moves it to PENDING. */
export const SubmitVerificationDocument = gql(`
  mutation MobileSubmitVerification($type: VerificationType!, $document_url: String!) {
    submitVerification(type: $type, document_url: $document_url) {
      type
      status
      document_url
    }
  }
`);

/** Submit a structured address for ADDRESS verification — moves it to PENDING. */
export const SubmitAddressVerificationDocument = gql(`
  mutation MobileSubmitAddressVerification(
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
`);
