import { gql } from '@apollo/client';
import type { LiteEventStatus, LiteVisibility } from '../../shared/graphql/documents';

/** What the Events grid shows per row. */
export interface LiteAdminEventRow {
  id: string;
  slug: string;
  title: string;
  start_at: string;
  status: LiteEventStatus;
  visibility: LiteVisibility;
  city_slug: string | null;
  city_name: string | null;
  featured: boolean;
  hidden: boolean;
  created_at: string;
  stats: { going: number };
}

const EVENT_ROW_FIELDS = gql`
  fragment LiteAdminEventRow on LiteEvent {
    id
    slug
    title
    start_at
    status
    visibility
    city_slug
    city_name
    featured
    hidden
    created_at
    stats {
      going
    }
  }
`;

export const LITE_ADMIN_EVENTS_TABLE = gql`
  query LiteAdminEventsTable($query: TableQueryInput) {
    liteAdminEventsTable(query: $query) {
      rows {
        ...LiteAdminEventRow
      }
      total
      page
      page_size
    }
  }
  ${EVENT_ROW_FIELDS}
`;

export const LITE_ADMIN_SET_EVENT_FLAGS = gql`
  mutation LiteAdminSetEventFlags($id: ID!, $featured: Boolean, $hidden: Boolean) {
    liteAdminSetEventFlags(id: $id, featured: $featured, hidden: $hidden) {
      ...LiteAdminEventRow
    }
  }
  ${EVENT_ROW_FIELDS}
`;

export const LITE_ADMIN_CANCEL_EVENT = gql`
  mutation LiteAdminCancelEvent($id: ID!, $reason: String) {
    liteAdminCancelEvent(id: $id, reason: $reason) {
      ...LiteAdminEventRow
      cancelled_at
      cancel_reason
    }
  }
  ${EVENT_ROW_FIELDS}
`;
