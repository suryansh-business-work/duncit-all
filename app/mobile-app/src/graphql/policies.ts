import { gql } from '@/generated/graphql';

/** The policy rendered as a downloadable PDF (base64) — saved/shared via expo. */
export const PolicyPdfDocument = gql(`
  query MobilePolicyPdf($slug: String!) {
    policyPdfBase64(slug: $slug)
  }
`);
