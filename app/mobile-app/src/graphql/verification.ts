import { gql } from '@/generated/graphql';

/** The signed-in user's 7 verification types + status. */
export const MyVerificationsDocument = gql(`
  query MobileMyVerifications {
    myVerifications {
      type
      status
      document_url
      reject_reason
    }
  }
`);

/** Submit/replace a verification document — moves it to PENDING. */
export const SubmitVerificationDocument = gql(`
  mutation MobileSubmitVerification($type: VerificationType!, $document_url: String!) {
    submitVerification(type: $type, document_url: $document_url) {
      type
      status
      document_url
    }
  }
`);
