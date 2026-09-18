import { gql, type TypedDocumentNode } from '@apollo/client';

/**
 * How the store is filed — pet types, categories, filters, collections and
 * brands. Several screens pick from these (a listing, a collection's rules, a
 * home section, the bulk "File under…"), so the reads live here once.
 */

export interface StorePetType {
  id: string;
  name: string;
  slug: string;
  icon_url: string;
  image_url: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string;
  banner_url: string;
  description: string;
  pet_type_ids: string[];
  sort_order: number;
  is_active: boolean;
  show_in_menu: boolean;
  seo_title: string;
  seo_description: string;
}

export interface StoreFacetOption {
  label: string;
  slug: string;
}

export interface StoreFacet {
  id: string;
  name: string;
  slug: string;
  options: StoreFacetOption[];
  sort_order: number;
  is_active: boolean;
}

export interface StoreBrand {
  id: string;
  name: string;
  logo_url: string;
}

const PET_TYPE_FIELDS = `
  id
  name
  slug
  icon_url
  image_url
  description
  sort_order
  is_active
`;

const CATEGORY_FIELDS = `
  id
  name
  slug
  parent_id
  image_url
  banner_url
  description
  pet_type_ids
  sort_order
  is_active
  show_in_menu
  seo_title
  seo_description
`;

const FACET_FIELDS = `
  id
  name
  slug
  options {
    label
    slug
  }
  sort_order
  is_active
`;

export const STORE_PET_TYPES: TypedDocumentNode<{ storeAdminPetTypes: StorePetType[] }> = gql`
  query StoreAdminPetTypes {
    storeAdminPetTypes {
      ${PET_TYPE_FIELDS}
    }
  }
`;

export const STORE_CATEGORIES: TypedDocumentNode<{ storeAdminCategories: StoreCategory[] }> = gql`
  query StoreAdminCategories {
    storeAdminCategories {
      ${CATEGORY_FIELDS}
    }
  }
`;

export const STORE_FACETS: TypedDocumentNode<{ storeAdminFacets: StoreFacet[] }> = gql`
  query StoreAdminFacets {
    storeAdminFacets {
      ${FACET_FIELDS}
    }
  }
`;

export const STORE_BRANDS: TypedDocumentNode<{ storeBrands: StoreBrand[] }> = gql`
  query StoreBrands {
    storeBrands {
      id
      name
      logo_url
    }
  }
`;

export const SAVE_PET_TYPE = gql`
  mutation StoreSavePetType($id: ID, $input: StorePetTypeInput!) {
    storeSavePetType(id: $id, input: $input) {
      ${PET_TYPE_FIELDS}
    }
  }
`;

export const DELETE_PET_TYPE = gql`
  mutation StoreDeletePetType($id: ID!) {
    storeDeletePetType(id: $id)
  }
`;

export const REORDER_PET_TYPES = gql`
  mutation StoreReorderPetTypes($ids: [ID!]!) {
    storeReorderPetTypes(ids: $ids)
  }
`;

export const SAVE_CATEGORY = gql`
  mutation StoreSaveCategory($id: ID, $input: StoreCategoryInput!) {
    storeSaveCategory(id: $id, input: $input) {
      ${CATEGORY_FIELDS}
    }
  }
`;

export const DELETE_CATEGORY = gql`
  mutation StoreDeleteCategory($id: ID!) {
    storeDeleteCategory(id: $id)
  }
`;

export const REORDER_CATEGORIES = gql`
  mutation StoreReorderCategories($ids: [ID!]!) {
    storeReorderCategories(ids: $ids)
  }
`;

export const SAVE_FACET = gql`
  mutation StoreSaveFacet($id: ID, $input: StoreFacetInput!) {
    storeSaveFacet(id: $id, input: $input) {
      ${FACET_FIELDS}
    }
  }
`;

export const DELETE_FACET = gql`
  mutation StoreDeleteFacet($id: ID!) {
    storeDeleteFacet(id: $id)
  }
`;

export const REORDER_FACETS = gql`
  mutation StoreReorderFacets($ids: [ID!]!) {
    storeReorderFacets(ids: $ids)
  }
`;
