import { gql } from '@apollo/client';

/**
 * The GraphQL documents both pages share: the account, the public settings,
 * sign-in, and the fragments every event/registration/calendar read is built
 * from. Page-specific documents live beside their pages.
 */
export const LITE_USER_FIELDS = gql`
  fragment LiteUserFields on LiteUser {
    id
    email
    name
    handle
    avatar_url
    bio
    upi_id
    upi_name
    locale
    is_admin
    is_blocked
    duncit_linked
    events_hosted
    created_at
  }
`;

export const LITE_CALENDAR_FIELDS = gql`
  fragment LiteCalendarFields on LiteCalendar {
    id
    slug
    name
    description
    avatar_url
    cover_url
    city_slug
    city_name
    owner {
      id
      name
      handle
      avatar_url
    }
    featured
    subscriber_count
    upcoming_count
    viewer_subscribed
    viewer_is_owner
    created_at
  }
`;

/** The event card: what a list shows. */
export const LITE_EVENT_CARD_FIELDS = gql`
  fragment LiteEventCardFields on LiteEvent {
    id
    slug
    title
    cover_url
    start_at
    end_at
    timezone
    location_type
    venue_name
    city_slug
    city_name
    visibility
    status
    featured
    hidden
    category {
      id
      name
      slug
      icon
    }
    hosts {
      user_id
      name
      handle
      avatar_url
      role
    }
    tickets {
      id
      name
      price
      quantity
      sold
      is_active
    }
    stats {
      going
      waitlisted
      pending
      payment_pending
      checked_in
      revenue_confirmed
    }
    viewer_is_host
  }
`;

/** The whole page. */
export const LITE_EVENT_FIELDS = gql`
  fragment LiteEventFields on LiteEvent {
    ...LiteEventCardFields
    description
    address
    map_url
    virtual_link
    calendar {
      ...LiteCalendarFields
    }
    capacity
    require_approval
    tickets {
      id
      name
      description
      price
      quantity
      sold
      is_active
    }
    questions {
      id
      label
      type
      required
      options
    }
    upi_id
    upi_name
    created_at
    updated_at
    published_at
    cancelled_at
    cancel_reason
  }
  ${LITE_EVENT_CARD_FIELDS}
  ${LITE_CALENDAR_FIELDS}
`;

export const LITE_REGISTRATION_FIELDS = gql`
  fragment LiteRegistrationFields on LiteRegistration {
    id
    code
    ticket {
      id
      name
      price
    }
    quantity
    amount_due
    status
    payment_status
    payment_reference
    payment_note
    payment_confirmed_at
    answers {
      question_id
      label
      answer
    }
    checked_in_at
    waitlist_position
    user {
      id
      name
      email
      handle
      avatar_url
    }
    created_at
  }
`;

export const LITE_ME = gql`
  query LiteMe {
    liteMe {
      ...LiteUserFields
    }
  }
  ${LITE_USER_FIELDS}
`;

export const LITE_SETTINGS = gql`
  query LiteSettings {
    liteSettings {
      site_name
      support_email
      default_timezone
      currency
      google_client_id
      sign_in_with_duncit
      upi_help_text
      duncit_app_url
    }
  }
`;

export const LITE_REQUEST_SIGN_IN_CODE = gql`
  mutation LiteRequestSignInCode($email: String!) {
    liteRequestSignInCode(email: $email) {
      ok
      via
      expires_in_minutes
      resend_after_seconds
      test_code
    }
  }
`;

export const LITE_VERIFY_SIGN_IN_CODE = gql`
  mutation LiteVerifySignInCode($email: String!, $code: String!, $name: String) {
    liteVerifySignInCode(email: $email, code: $code, name: $name) {
      token
      user {
        ...LiteUserFields
      }
    }
  }
  ${LITE_USER_FIELDS}
`;

export const LITE_SIGN_IN_WITH_GOOGLE = gql`
  mutation LiteSignInWithGoogle($id_token: String!) {
    liteSignInWithGoogle(id_token: $id_token) {
      token
      user {
        ...LiteUserFields
      }
    }
  }
  ${LITE_USER_FIELDS}
`;

export const LITE_SET_MY_LOCALE = gql`
  mutation LiteSetMyLocale($locale: String!) {
    liteSetMyLocale(locale: $locale) {
      id
      locale
    }
  }
`;

export interface LiteMe {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  upi_id: string | null;
  upi_name: string | null;
  locale: string | null;
  is_admin: boolean;
  is_blocked: boolean;
  duncit_linked: boolean;
  events_hosted: number;
  created_at: string;
}

export interface LitePublicSettings {
  site_name: string;
  support_email: string;
  default_timezone: string;
  currency: string;
  google_client_id: string;
  sign_in_with_duncit: boolean;
  upi_help_text: string;
  duncit_app_url: string;
}

export type LiteSignInVia = 'LITE' | 'DUNCIT';
export type LiteEventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export type LiteVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
export type LiteLocationType = 'IN_PERSON' | 'VIRTUAL';
export type LiteRegistrationStatus = 'PENDING_APPROVAL' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'WAITLISTED' | 'DECLINED' | 'CANCELLED';
export type LitePaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'REJECTED';
export type LiteQuestionType = 'TEXT' | 'LONG_TEXT' | 'CHECKBOX' | 'SELECT';

export interface LiteHost {
  user_id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  role: 'HOST' | 'CO_HOST';
}

export interface LiteTicketType {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number | null;
  sold: number;
  is_active: boolean;
}

export interface LiteQuestion {
  id: string;
  label: string;
  type: LiteQuestionType;
  required: boolean;
  options: string[];
}

export interface LiteEventStats {
  going: number;
  waitlisted: number;
  pending: number;
  payment_pending: number;
  checked_in: number;
  revenue_confirmed: number;
}

export interface LiteCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order?: number;
  is_active?: boolean;
  events_count?: number;
}

export interface LiteCity {
  id: string;
  name: string;
  slug: string;
  country: string;
  cover_url: string | null;
  featured: boolean;
  sort_order: number;
  is_active: boolean;
  events_count: number;
}

export interface LiteCalendar {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  city_slug: string | null;
  city_name: string | null;
  owner: { id: string; name: string; handle: string; avatar_url: string | null };
  featured: boolean;
  subscriber_count: number;
  upcoming_count: number;
  viewer_subscribed: boolean;
  viewer_is_owner: boolean;
  created_at: string;
}

export interface LiteEventCard {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: LiteLocationType;
  venue_name: string | null;
  city_slug: string | null;
  city_name: string | null;
  visibility: LiteVisibility;
  status: LiteEventStatus;
  featured: boolean;
  hidden: boolean;
  category: LiteCategory | null;
  hosts: LiteHost[];
  tickets: LiteTicketType[];
  stats: LiteEventStats;
  viewer_is_host: boolean;
}

export interface LiteEvent extends LiteEventCard {
  description: string;
  address: string | null;
  map_url: string | null;
  virtual_link: string | null;
  calendar: LiteCalendar | null;
  capacity: number | null;
  require_approval: boolean;
  questions: LiteQuestion[];
  upi_id: string | null;
  upi_name: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  viewer_registration?: LiteRegistration | null;
}

export interface LiteRegistration {
  id: string;
  code: string;
  event?: LiteEvent | LiteEventCard | null;
  ticket: { id: string; name: string; price: number };
  quantity: number;
  amount_due: number;
  status: LiteRegistrationStatus;
  payment_status: LitePaymentStatus;
  payment_reference: string | null;
  payment_note: string | null;
  payment_confirmed_at: string | null;
  answers: { question_id: string; label: string; answer: string }[];
  checked_in_at: string | null;
  waitlist_position: number | null;
  user: { id: string; name: string; email: string; handle: string; avatar_url: string | null };
  created_at: string;
}
