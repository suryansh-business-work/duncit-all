import { gql } from '@apollo/client';

export interface LiteAdminStats {
  users: number;
  events: number;
  published_events: number;
  upcoming_events: number;
  registrations: number;
  confirmed_registrations: number;
  revenue_confirmed: number;
  calendars: number;
  emails_sent_7d: number;
}

export interface LiteAdminSettings {
  site_name: string;
  support_email: string;
  default_timezone: string;
  date_format: string;
  time_format: string;
  currency: string;
  sign_in_with_duncit: boolean;
  duncit_graphql_url: string;
  duncit_app_url: string;
  reminders_enabled: boolean;
  reminder_hours_before: number[];
  upi_help_text: string;
  admin_emails: string[];
  max_ticket_price: number;
}

export const LITE_ADMIN_STATS = gql`
  query LiteAdminStats {
    liteAdminStats {
      users
      events
      published_events
      upcoming_events
      registrations
      confirmed_registrations
      revenue_confirmed
      calendars
      emails_sent_7d
    }
  }
`;

const SETTINGS_FIELDS = `
  site_name
  support_email
  default_timezone
  date_format
  time_format
  currency
  sign_in_with_duncit
  duncit_graphql_url
  duncit_app_url
  reminders_enabled
  reminder_hours_before
  upi_help_text
  admin_emails
  max_ticket_price
`;

export const LITE_ADMIN_SETTINGS = gql`
  query LiteAdminSettings {
    liteAdminSettings {
      ${SETTINGS_FIELDS}
    }
  }
`;

export const LITE_ADMIN_UPDATE_SETTINGS = gql`
  mutation LiteAdminUpdateSettings($input: LiteAdminSettingsInput!) {
    liteAdminUpdateSettings(input: $input) {
      ${SETTINGS_FIELDS}
    }
  }
`;
