import { gql, type TypedDocumentNode } from '@apollo/client';
import {
  LITE_CALENDAR_FIELDS,
  LITE_EVENT_CARD_FIELDS,
  type LiteCalendar,
  type LiteCategory,
  type LiteCity,
  type LiteEventCard,
} from '../../shared/graphql/documents';
import type { NoVars } from './types';

export interface LiteDiscover {
  categories: LiteCategory[];
  cities: LiteCity[];
  featured_calendars: LiteCalendar[];
  popular_events: LiteEventCard[];
  upcoming_events: LiteEventCard[];
}

const LITE_CITY_FIELDS = gql`
  fragment LiteCityFields on LiteCity {
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

export const LITE_DISCOVER: TypedDocumentNode<{ liteDiscover: LiteDiscover }, { city_slug?: string | null }> = gql`
  query LiteDiscover($city_slug: String) {
    liteDiscover(city_slug: $city_slug) {
      categories {
        id
        name
        slug
        icon
        events_count
      }
      cities {
        ...LiteCityFields
      }
      featured_calendars {
        ...LiteCalendarFields
      }
      popular_events {
        ...LiteEventCardFields
      }
      upcoming_events {
        ...LiteEventCardFields
      }
    }
  }
  ${LITE_CITY_FIELDS}
  ${LITE_CALENDAR_FIELDS}
  ${LITE_EVENT_CARD_FIELDS}
`;

export const LITE_CITIES: TypedDocumentNode<{ liteCities: LiteCity[] }, NoVars> = gql`
  query LiteCities {
    liteCities {
      ...LiteCityFields
    }
  }
  ${LITE_CITY_FIELDS}
`;

export const LITE_CATEGORIES: TypedDocumentNode<{ liteCategories: LiteCategory[] }, NoVars> = gql`
  query LiteCategories {
    liteCategories {
      id
      name
      slug
      icon
      events_count
    }
  }
`;

export const LITE_CITY: TypedDocumentNode<{ liteCity: LiteCity | null }, { slug: string }> = gql`
  query LiteCity($slug: String!) {
    liteCity(slug: $slug) {
      ...LiteCityFields
    }
  }
  ${LITE_CITY_FIELDS}
`;
