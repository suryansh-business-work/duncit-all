import { gql } from '@apollo/client';
import type { LiteCity } from '../../shared/graphql/documents';

/** A category as the console lists it — every field, unlike the web app's card slice. */
export interface LiteAdminCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  events_count: number;
}

export type LiteAdminCity = LiteCity;

export interface LiteCategoryInput {
  name: string;
  slug?: string | null;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface LiteCityInput {
  name: string;
  slug?: string | null;
  country?: string | null;
  cover_url?: string | null;
  featured?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

const CATEGORY_FIELDS = gql`
  fragment LiteAdminCategoryFields on LiteCategory {
    id
    name
    slug
    icon
    sort_order
    is_active
    events_count
  }
`;

const CITY_FIELDS = gql`
  fragment LiteAdminCityFields on LiteCity {
    id
    name
    slug
    country
    cover_url
    featured
    sort_order
    is_active
    events_count
  }
`;

export const LITE_ADMIN_CATEGORIES = gql`
  query LiteAdminCategories {
    liteCategories(include_inactive: true) {
      ...LiteAdminCategoryFields
    }
  }
  ${CATEGORY_FIELDS}
`;

export const LITE_UPSERT_CATEGORY = gql`
  mutation LiteUpsertCategory($id: ID, $input: LiteCategoryInput!) {
    liteUpsertCategory(id: $id, input: $input) {
      ...LiteAdminCategoryFields
    }
  }
  ${CATEGORY_FIELDS}
`;

export const LITE_DELETE_CATEGORY = gql`
  mutation LiteDeleteCategory($id: ID!) {
    liteDeleteCategory(id: $id)
  }
`;

export const LITE_ADMIN_CITIES = gql`
  query LiteAdminCities {
    liteCities(include_inactive: true) {
      ...LiteAdminCityFields
    }
  }
  ${CITY_FIELDS}
`;

export const LITE_UPSERT_CITY = gql`
  mutation LiteUpsertCity($id: ID, $input: LiteCityInput!) {
    liteUpsertCity(id: $id, input: $input) {
      ...LiteAdminCityFields
    }
  }
  ${CITY_FIELDS}
`;

export const LITE_DELETE_CITY = gql`
  mutation LiteDeleteCity($id: ID!) {
    liteDeleteCity(id: $id)
  }
`;
