import { gql, type TypedDocumentNode } from '@apollo/client';

export type SectionKind =
  | 'HERO_SLIDER'
  | 'PET_TYPES'
  | 'CATEGORY_GRID'
  | 'COLLECTION_CAROUSEL'
  | 'PROMO_BANNERS'
  | 'BRANDS'
  | 'USP_STRIP'
  | 'NEWSLETTER'
  | 'FLASH_SALE'
  | 'PRODUCT_SLIDER'
  | 'CATEGORY_ICONS';

/** Where a product slider takes its products from. */
export type ProductSource = 'MANUAL' | 'COLLECTION' | 'CATEGORY' | 'BESTSELLING' | 'NEWEST' | 'DISCOUNT' | 'FEATURED';

export interface StoreSectionItem {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  mobile_image_url: string;
  cta_label: string;
  link: string;
}

export interface StoreSection {
  id: string;
  kind: SectionKind;
  title: string;
  subtitle: string;
  items: StoreSectionItem[];
  collection_id: string | null;
  category_ids: string[];
  product_limit: number;
  /** A flash sale's discount steps, in percent. */
  discount_tiers: number[];
  product_source: ProductSource;
  /** A MANUAL slider's picks, in order. */
  product_ids: string[];
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const SECTION_FIELDS = `
  id
  kind
  title
  subtitle
  items {
    id
    title
    subtitle
    image_url
    mobile_image_url
    cta_label
    link
  }
  collection_id
  category_ids
  product_limit
  discount_tiers
  product_source
  product_ids
  sort_order
  is_active
  starts_at
  ends_at
`;

export const STORE_SECTIONS: TypedDocumentNode<{ storeAdminSections: StoreSection[] }> = gql`
  query StoreAdminSections {
    storeAdminSections {
      ${SECTION_FIELDS}
    }
  }
`;

export const SAVE_SECTION = gql`
  mutation StoreSaveSection($id: ID, $input: StoreSectionInput!) {
    storeSaveSection(id: $id, input: $input) {
      ${SECTION_FIELDS}
    }
  }
`;

export const DELETE_SECTION = gql`
  mutation StoreDeleteSection($id: ID!) {
    storeDeleteSection(id: $id)
  }
`;

export const REORDER_SECTIONS = gql`
  mutation StoreReorderSections($ids: [ID!]!) {
    storeReorderSections(ids: $ids)
  }
`;
