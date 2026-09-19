import { gql, type TypedDocumentNode } from '@apollo/client';
import { LITE_CALENDAR_FIELDS, LITE_EVENT_CARD_FIELDS, type LiteCalendar, type LiteEventCard } from '../../shared/graphql/documents';
import type { NoVars } from './types';

export const LITE_CALENDAR: TypedDocumentNode<{ liteCalendar: LiteCalendar | null }, { slug: string }> = gql`
  query LiteCalendar($slug: String!) {
    liteCalendar(slug: $slug) {
      ...LiteCalendarFields
    }
  }
  ${LITE_CALENDAR_FIELDS}
`;

export const LITE_CALENDAR_EVENTS: TypedDocumentNode<{ liteCalendarEvents: LiteEventCard[] }, { slug: string; past?: boolean }> = gql`
  query LiteCalendarEvents($slug: String!, $past: Boolean) {
    liteCalendarEvents(slug: $slug, past: $past) {
      ...LiteEventCardFields
    }
  }
  ${LITE_EVENT_CARD_FIELDS}
`;

export const LITE_MY_CALENDARS: TypedDocumentNode<{ liteMyCalendars: LiteCalendar[] }, NoVars> = gql`
  query LiteMyCalendars {
    liteMyCalendars {
      ...LiteCalendarFields
    }
  }
  ${LITE_CALENDAR_FIELDS}
`;

export interface LiteCalendarInput {
  name: string;
  slug: string | null;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  city_slug: string | null;
}

export const LITE_CREATE_CALENDAR: TypedDocumentNode<{ liteCreateCalendar: LiteCalendar }, { input: LiteCalendarInput }> = gql`
  mutation LiteCreateCalendar($input: LiteCalendarInput!) {
    liteCreateCalendar(input: $input) {
      ...LiteCalendarFields
    }
  }
  ${LITE_CALENDAR_FIELDS}
`;

export const LITE_UPDATE_CALENDAR: TypedDocumentNode<{ liteUpdateCalendar: LiteCalendar }, { id: string; input: LiteCalendarInput }> = gql`
  mutation LiteUpdateCalendar($id: ID!, $input: LiteCalendarInput!) {
    liteUpdateCalendar(id: $id, input: $input) {
      ...LiteCalendarFields
    }
  }
  ${LITE_CALENDAR_FIELDS}
`;

export const LITE_SUBSCRIBE_CALENDAR: TypedDocumentNode<{ liteSubscribeCalendar: LiteCalendar }, { id: string }> = gql`
  mutation LiteSubscribeCalendar($id: ID!) {
    liteSubscribeCalendar(id: $id) {
      ...LiteCalendarFields
    }
  }
  ${LITE_CALENDAR_FIELDS}
`;

export const LITE_UNSUBSCRIBE_CALENDAR: TypedDocumentNode<{ liteUnsubscribeCalendar: LiteCalendar }, { id: string }> = gql`
  mutation LiteUnsubscribeCalendar($id: ID!) {
    liteUnsubscribeCalendar(id: $id) {
      ...LiteCalendarFields
    }
  }
  ${LITE_CALENDAR_FIELDS}
`;
