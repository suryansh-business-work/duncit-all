import { gql } from '@apollo/client';

/** Duncit + brand products the requester can propose edits to. */
export const REQUEST_PRODUCTS = gql`
  query RequestableProducts {
    inventoryProducts {
      id
      product_name
      short_description
      description
      selling_price
    }
  }
`;

/** Marketplace brands the requester can propose edits to. */
export const REQUEST_BRANDS = gql`
  query RequestableBrands {
    marketplaceBrands {
      id
      brand_name
      tagline
      description
      website_url
    }
  }
`;

/** The change requests raised from this portal (kind = BRAND | PRODUCT). */
export const MY_ECOMM_CHANGE_REQUESTS = gql`
  query MyEcommChangeRequests($kind: String) {
    myEcommChangeRequests(kind: $kind) {
      id
      title
      status
      summary
      created_at
      review_notes
      details {
        label
        value
      }
    }
  }
`;

/** Submit a brand/product change for admin approval. */
export const SUBMIT_ECOMM_CHANGE = gql`
  mutation SubmitEcommChange($input: EcommChangeRequestInput!) {
    submitEcommChangeRequest(input: $input) {
      id
      status
    }
  }
`;
