import { gql } from '@apollo/client';

/** What the Calendars grid shows per row. */
export interface LiteAdminCalendarRow {
  id: string;
  slug: string;
  name: string;
  city_slug: string | null;
  city_name: string | null;
  owner: { id: string; name: string; handle: string };
  featured: boolean;
  subscriber_count: number;
  upcoming_count: number;
  created_at: string;
}

const CALENDAR_ROW_FIELDS = gql`
  fragment LiteAdminCalendarRow on LiteCalendar {
    id
    slug
    name
    city_slug
    city_name
    owner {
      id
      name
      handle
    }
    featured
    subscriber_count
    upcoming_count
    created_at
  }
`;

export const LITE_ADMIN_CALENDARS_TABLE = gql`
  query LiteAdminCalendarsTable($query: TableQueryInput) {
    liteAdminCalendarsTable(query: $query) {
      rows {
        ...LiteAdminCalendarRow
      }
      total
      page
      page_size
    }
  }
  ${CALENDAR_ROW_FIELDS}
`;

export const LITE_ADMIN_SET_CALENDAR_FEATURED = gql`
  mutation LiteAdminSetCalendarFeatured($id: ID!, $featured: Boolean!) {
    liteAdminSetCalendarFeatured(id: $id, featured: $featured) {
      ...LiteAdminCalendarRow
    }
  }
  ${CALENDAR_ROW_FIELDS}
`;
