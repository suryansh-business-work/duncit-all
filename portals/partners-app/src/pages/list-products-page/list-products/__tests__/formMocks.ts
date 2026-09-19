/**
 * Apollo mocks for the product wizard's own mutations. The documents are not
 * exported by the form, so they are redeclared here field-for-field — a drift
 * in the form's selection stops these mocks matching and fails its suites.
 */
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';

const PRODUCT_FIELDS = `
  id
  product_name
  listing_review_status
  images
  image_url
  inventory_count
  unit_cost
  brand_id
  super_category_id
  category_id
  sub_category_id
`;

export const SUBMIT_PRODUCT_LISTING = gql`
  mutation SubmitProductListing($input: ProductListingInput!) {
    submitProductListing(input: $input) { ${PRODUCT_FIELDS} }
  }
`;

export const UPDATE_PRODUCT_LISTING = gql`
  mutation UpdateMyProductListing($product_doc_id: ID!, $input: ProductListingInput!) {
    updateMyProductListing(product_doc_id: $product_doc_id, input: $input) { ${PRODUCT_FIELDS} }
  }
`;

export const MODERATE_PRODUCT_CONTENT = gql`
  mutation ModerateProductContent($input: ModerateProductContentInput!) {
    moderateProductContent(input: $input) {
      allowed
      violations {
        field
        step
        type
        message
        evidence
      }
    }
  }
`;

export interface Violation {
  field: string;
  step: 'REGEX' | 'AI';
  type: string;
  message: string;
  evidence: string | null;
}

type Capture = (variables: Record<string, unknown>) => void;

const noCapture: Capture = () => undefined;

/** A variables matcher that records what the form sent and accepts it. */
const capturing = (capture: Capture) => (variables: Record<string, unknown>) => {
  capture(variables);
  return true;
};

export const moderationMock = (
  violations: Violation[] = [],
  capture: Capture = noCapture,
  delay = 0,
): MockedResponse => ({
  request: { query: MODERATE_PRODUCT_CONTENT, variables: capturing(capture) },
  delay,
  result: {
    data: {
      moderateProductContent: {
        __typename: 'ModerationResult',
        allowed: violations.length === 0,
        violations: violations.map((violation) => ({ __typename: 'ModerationViolation', ...violation })),
      },
    },
  },
});

export const savedListing = (id: string) => ({
  __typename: 'InventoryProduct',
  id,
  product_name: 'Saved product',
  listing_review_status: 'PENDING',
  images: [],
  image_url: '',
  inventory_count: 0,
  unit_cost: 0,
  brand_id: 'b1',
  super_category_id: 's1',
  category_id: 'c1',
  sub_category_id: 'sc1',
});

export const updateMock = (capture: Capture = noCapture): MockedResponse => ({
  request: { query: UPDATE_PRODUCT_LISTING, variables: capturing(capture) },
  result: { data: { updateMyProductListing: savedListing('p1') } },
});

export const submitMock = (capture: Capture = noCapture): MockedResponse => ({
  request: { query: SUBMIT_PRODUCT_LISTING, variables: capturing(capture) },
  result: { data: { submitProductListing: savedListing('p9') } },
});
