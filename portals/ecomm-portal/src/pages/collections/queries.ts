import { gql, type TypedDocumentNode } from '@apollo/client';

export type CollectionMode = 'MANUAL' | 'SMART';

export interface StoreCollectionRules {
  pet_type_ids: string[];
  category_ids: string[];
  brand_ids: string[];
  tags: string[];
  min_discount_pct: number;
  max_price: number;
  featured_only: boolean;
  in_stock_only: boolean;
}

export interface StoreCollection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  banner_url: string;
  mode: CollectionMode;
  product_ids: string[];
  rules: StoreCollectionRules;
  sort_order: number;
  is_active: boolean;
  seo_title: string;
  seo_description: string;
}

const COLLECTION_FIELDS = `
  id
  name
  slug
  description
  image_url
  banner_url
  mode
  product_ids
  rules {
    pet_type_ids
    category_ids
    brand_ids
    tags
    min_discount_pct
    max_price
    featured_only
    in_stock_only
  }
  sort_order
  is_active
  seo_title
  seo_description
`;

export const STORE_COLLECTIONS: TypedDocumentNode<{ storeAdminCollections: StoreCollection[] }> = gql`
  query StoreAdminCollections {
    storeAdminCollections {
      ${COLLECTION_FIELDS}
    }
  }
`;

export const STORE_COLLECTION: TypedDocumentNode<{ storeAdminCollection: StoreCollection }, { id: string }> = gql`
  query StoreAdminCollection($id: ID!) {
    storeAdminCollection(id: $id) {
      ${COLLECTION_FIELDS}
    }
  }
`;

export const SAVE_COLLECTION: TypedDocumentNode<
  { storeSaveCollection: StoreCollection },
  { id: string | null; input: Record<string, unknown> }
> = gql`
  mutation StoreSaveCollection($id: ID, $input: StoreCollectionInput!) {
    storeSaveCollection(id: $id, input: $input) {
      ${COLLECTION_FIELDS}
    }
  }
`;

export const DELETE_COLLECTION = gql`
  mutation StoreDeleteCollection($id: ID!) {
    storeDeleteCollection(id: $id)
  }
`;

export const REORDER_COLLECTIONS = gql`
  mutation StoreReorderCollections($ids: [ID!]!) {
    storeReorderCollections(ids: $ids)
  }
`;
