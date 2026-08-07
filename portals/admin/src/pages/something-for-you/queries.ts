import { gql } from '@apollo/client';

const FIELDS = gql`
  fragment SomethingForYouFields on SomethingForYouItem {
    id
    title
    image_url
    bottom_text
    link_path
    sort_order
    is_active
  }
`;

export const SOMETHING_FOR_YOU_ITEMS = gql`
  query SomethingForYouItems {
    somethingForYouItems {
      ...SomethingForYouFields
    }
  }
  ${FIELDS}
`;

export const CREATE_SOMETHING_FOR_YOU = gql`
  mutation CreateSomethingForYouItem($input: SomethingForYouInput!) {
    createSomethingForYouItem(input: $input) {
      ...SomethingForYouFields
    }
  }
  ${FIELDS}
`;

export const UPDATE_SOMETHING_FOR_YOU = gql`
  mutation UpdateSomethingForYouItem($itemId: ID!, $input: SomethingForYouInput!) {
    updateSomethingForYouItem(item_id: $itemId, input: $input) {
      ...SomethingForYouFields
    }
  }
  ${FIELDS}
`;

export const DELETE_SOMETHING_FOR_YOU = gql`
  mutation DeleteSomethingForYouItem($itemId: ID!) {
    deleteSomethingForYouItem(item_id: $itemId)
  }
`;

/**
 * Thirty, matching the server's validator.
 *
 * Repeated rather than imported because the admin portal cannot import from
 * `server/src` — the counter under the field and the rule that rejects the save
 * have to agree, so the number lives beside the field that shows it.
 */
export const TITLE_MAX = 30;

export interface SomethingForYouForm {
  id?: string;
  title: string;
  image_url: string;
  bottom_text: string;
  link_path: string;
  sort_order: number;
  is_active: boolean;
}

export const emptyItem: SomethingForYouForm = {
  title: '',
  image_url: '',
  bottom_text: '',
  link_path: '',
  sort_order: 0,
  is_active: true,
};
