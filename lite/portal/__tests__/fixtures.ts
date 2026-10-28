import type { LiteMe } from '../../shared/graphql/documents';
import type { LiteSessionValue } from '../../shared/session';
import type { LiteAdminSettings, LiteAdminStats } from '../graphql/admin';
import type { LiteAdminCalendarRow } from '../graphql/calendars';
import type { LiteAdminCategory, LiteAdminCity } from '../graphql/catalogue';
import type { LiteEmailLogRow, LiteEmailTemplate } from '../graphql/email';
import type { LiteEnvCategoryDef, LiteEnvEntry, LiteEnvFieldDef } from '../graphql/environment';
import type { LiteAdminEventRow } from '../graphql/events';
import type { LiteLocale, LiteTranslationRow } from '../graphql/localization';
import type { LiteAdminRegistrationRow } from '../graphql/registrations';

/**
 * Typed rows for the console's tests. Each builder returns a complete, valid
 * record; a test overrides only the fields its case is about.
 */

export const makeSettings = (over: Partial<LiteAdminSettings> = {}): LiteAdminSettings => ({
  site_name: 'Duncit Lite',
  support_email: 'help@lite.example',
  // A zone every engine lists: V8 names India 'Asia/Calcutta', not the server's default 'Asia/Kolkata'.
  default_timezone: 'Europe/London',
  date_format: 'dd MMM yyyy',
  time_format: 'hh:mm a',
  currency: 'INR',
  sign_in_with_duncit: true,
  duncit_graphql_url: 'https://api.example.com/graphql',
  duncit_app_url: 'https://app.example.com',
  reminders_enabled: true,
  reminder_hours_before: [24, 1],
  upi_help_text: 'Pay the host by UPI.',
  admin_emails: ['owner@lite.example', 'ops@lite.example'],
  max_ticket_price: 50_000,
  max_event_capacity: 5_000,
  max_seats_per_registration: 10,
  sign_in_with_phone: false,
  ...over,
});

export const makeStats = (over: Partial<LiteAdminStats> = {}): LiteAdminStats => ({
  users: 1250,
  events: 84,
  published_events: 60,
  upcoming_events: 12,
  registrations: 3400,
  confirmed_registrations: 3100,
  revenue_confirmed: 125_000,
  calendars: 9,
  emails_sent_7d: 640,
  ...over,
});

export const makeCity = (over: Partial<LiteAdminCity> = {}): LiteAdminCity => ({
  id: 'city-1',
  name: 'Bengaluru',
  slug: 'bengaluru',
  country: 'India',
  region: 'ASIA_PACIFIC',
  cover_url: 'https://img.example.com/blr.jpg',
  featured: true,
  sort_order: 3,
  is_active: true,
  events_count: 42,
  ...over,
});

export const makeCategory = (over: Partial<LiteAdminCategory> = {}): LiteAdminCategory => ({
  id: 'cat-1',
  name: 'Music',
  slug: 'music',
  icon: 'MusicNote',
  sort_order: 1,
  is_active: true,
  events_count: 7,
  ...over,
});

export const makeLocale = (over: Partial<LiteLocale> = {}): LiteLocale => ({
  code: 'en-IN',
  label: 'English',
  english_label: 'English',
  is_rtl: false,
  is_default: true,
  sort_order: 0,
  is_active: true,
  translated_count: 320,
  ...over,
});

export const makeTranslation = (over: Partial<LiteTranslationRow> = {}): LiteTranslationRow => ({
  id: 'tr-1',
  key: 'liteWeb.nav.discover',
  locale: 'hi',
  value: 'खोजें',
  updated_at: '2026-03-15T09:00:00.000Z',
  ...over,
});

export const makeField = (over: Partial<LiteEnvFieldDef> = {}): LiteEnvFieldDef => ({
  name: 'host',
  label: 'SMTP Host',
  secret: false,
  number: false,
  bool: false,
  hint: 'e.g. smtp.gmail.com',
  min: null,
  max: null,
  ...over,
});

/** The EMAIL category as the server defines it: text, a bounded number, a secret and a switch. */
export const emailCategory = (over: Partial<LiteEnvCategoryDef> = {}): LiteEnvCategoryDef => ({
  category: 'EMAIL',
  label: 'Email (SMTP)',
  docUrl: 'https://support.example.com/smtp',
  fields: [
    makeField(),
    makeField({ name: 'port', label: 'Port', number: true, min: 1, max: 65_535, hint: '465 (SSL) or 587 (TLS)' }),
    makeField({ name: 'password', label: 'Password', secret: true, hint: 'SMTP password or app password' }),
    makeField({ name: 'secure', label: 'Use TLS', bool: true, hint: null }),
  ],
  ...over,
});

/** MSG91: the country code is a number field bounded 1..9999. */
export const msg91Category = (): LiteEnvCategoryDef => ({
  category: 'MSG91',
  label: 'MSG91 (SMS sign-in)',
  docUrl: null,
  fields: [
    makeField({ name: 'widget_id', label: 'Widget ID', hint: null }),
    makeField({ name: 'auth_key', label: 'Auth Key', secret: true, hint: null }),
    makeField({ name: 'default_country_code', label: 'Default Country Code', number: true, min: 1, max: 9999, hint: '91 for India' }),
  ],
});

export const makeEnvEntry = (over: Partial<LiteEnvEntry> = {}): LiteEnvEntry => ({
  id: 'env-1',
  name: 'Primary SMTP',
  category: 'EMAIL',
  description: 'Gmail relay',
  is_default: false,
  is_active: true,
  config: [
    { key: 'host', value: 'smtp.example.com' },
    { key: 'port', value: '587' },
    { key: 'secure', value: 'true' },
  ],
  secrets: [{ key: 'has_password', present: true }],
  last_tested_at: null,
  last_test_ok: null,
  created_at: '2026-03-01T10:00:00.000Z',
  updated_at: '2026-03-02T10:00:00.000Z',
  ...over,
});

export const makeEventRow = (over: Partial<LiteAdminEventRow> = {}): LiteAdminEventRow => ({
  id: 'ev-1',
  slug: 'jazz-night',
  title: 'Jazz Night',
  start_at: '2026-03-15T14:30:00.000Z',
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  city_slug: 'bengaluru',
  city_name: 'Bengaluru',
  featured: false,
  hidden: false,
  created_at: '2026-02-01T08:00:00.000Z',
  stats: { going: 18 },
  ...over,
});

export const makeMe = (over: Partial<LiteMe> = {}): LiteMe => ({
  id: 'user-1',
  email: 'asha@lite.example',
  phone: null,
  name: 'Asha Rao',
  handle: 'asha',
  avatar_url: null,
  bio: null,
  social: { instagram: '', x: '', youtube: '', tiktok: '', linkedin: '', website: '' },
  upi_id: null,
  upi_name: null,
  locale: null,
  display_mode: 'SYSTEM',
  is_admin: false,
  is_blocked: false,
  duncit_linked: false,
  events_hosted: 2,
  events_attended: 5,
  created_at: '2026-01-10T12:00:00.000Z',
  ...over,
});

export const makeRegistration = (over: Partial<LiteAdminRegistrationRow> = {}): LiteAdminRegistrationRow => ({
  id: 'reg-1',
  code: 'LT-7Q2X',
  quantity: 2,
  amount_due: 1500,
  status: 'CONFIRMED',
  payment_status: 'PAID',
  payment_reference: 'UTR123456',
  created_at: '2026-03-10T06:00:00.000Z',
  ticket: { id: 'tk-1', name: 'General', price: 750 },
  user: { id: 'user-2', name: 'Ravi Kumar', email: 'ravi@lite.example', handle: 'ravi' },
  event: { id: 'ev-1', slug: 'jazz-night', title: 'Jazz Night', start_at: '2026-03-15T14:30:00.000Z' },
  ...over,
});

export const makeCalendar = (over: Partial<LiteAdminCalendarRow> = {}): LiteAdminCalendarRow => ({
  id: 'cal-1',
  slug: 'indie-gigs',
  name: 'Indie Gigs',
  city_slug: 'bengaluru',
  city_name: 'Bengaluru',
  owner: { id: 'user-3', name: 'Meera Iyer', handle: 'meera' },
  featured: false,
  subscriber_count: 120,
  upcoming_count: 4,
  created_at: '2026-01-20T08:00:00.000Z',
  ...over,
});

export const makeTemplate = (over: Partial<LiteEmailTemplate> = {}): LiteEmailTemplate => ({
  id: 'tpl-1',
  key: 'registration_confirmed',
  name: 'Registration confirmed',
  description: 'Sent when a guest is confirmed',
  subject: 'You are going to {event_title}',
  body: 'Hi {guest_name}, see you there.',
  enabled: true,
  vars: ['guest_name', 'event_title'],
  sent_count: 31,
  updated_at: '2026-03-05T10:00:00.000Z',
  ...over,
});

export const makeEmailLog = (over: Partial<LiteEmailLogRow> = {}): LiteEmailLogRow => ({
  id: 'log-1',
  to: 'ravi@lite.example',
  subject: 'You are going to Jazz Night',
  template_key: 'registration_confirmed',
  status: 'SENT',
  error: null,
  message_id: '<abc@mail.example>',
  created_at: '2026-03-15T14:30:00.000Z',
  ...over,
});

/** A session value with resolvable async actions; tests override what their case needs. */
export const makeSession = (over: Partial<LiteSessionValue> = {}): LiteSessionValue => ({
  signedIn: true,
  me: makeMe({ is_admin: true }),
  resolving: false,
  error: null,
  completeSignIn: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  refresh: () => Promise.resolve(),
  ...over,
});
