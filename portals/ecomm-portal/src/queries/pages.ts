import { gql, type TypedDocumentNode } from '@apollo/client';

/** One of the store's own pages — a policy, a guide, an about page — beyond the four built-in ones. */
export interface StorePage {
  id: string;
  title: string;
  slug: string;
  content_html: string;
  show_in_footer: boolean;
  is_active: boolean;
  sort_order: number;
  seo_title: string;
  seo_description: string;
  updated_at: string;
}

const PAGE_FIELDS = `
  id
  title
  slug
  content_html
  show_in_footer
  is_active
  sort_order
  seo_title
  seo_description
  updated_at
`;

export const STORE_PAGES: TypedDocumentNode<{ storeAdminPages: StorePage[] }> = gql`
  query StoreAdminPages {
    storeAdminPages {
      ${PAGE_FIELDS}
    }
  }
`;

export const SAVE_PAGE = gql`
  mutation StoreSavePage($id: ID, $input: StorePageInput!) {
    storeSavePage(id: $id, input: $input) {
      ${PAGE_FIELDS}
    }
  }
`;

export const DELETE_PAGE = gql`
  mutation StoreDeletePage($id: ID!) {
    storeDeletePage(id: $id)
  }
`;

export const REORDER_PAGES = gql`
  mutation StoreReorderPages($ids: [ID!]!) {
    storeReorderPages(ids: $ids)
  }
`;
