import { z } from 'zod';
import { EMAIL } from '@duncit/regex';
import type { Translate } from '@duncit/forms/schemas';
import { SETTING_BOUNDS, countIssue } from '../../../../shared/limits';
import { countRule } from '../../../components/countRule';
import type { LiteAdminSettings } from '../../../graphql/admin';

/** Lists are edited as comma-separated text; numbers as text; parsed on submit. */
export interface SettingsFormValues {
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
  reminder_hours_before: string;
  upi_help_text: string;
  admin_emails: string;
  max_ticket_price: string;
  max_event_capacity: string;
  max_seats_per_registration: string;
  sign_in_with_phone: boolean;
}

/** Every IANA zone the browser knows, read once. */
export const TIME_ZONES: readonly string[] = Intl.supportedValuesOf('timeZone');
const TIME_ZONE_SET: ReadonlySet<string> = new Set(TIME_ZONES);

const HOURS_LIST = /^\d+(\s*,\s*\d+)*$/;
const CURRENCY = /^[A-Z]{3}$/;

const splitList = (text: string): string[] =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');

const isBlankOrHttpUrl = (value: string): boolean => {
  if (value === '') return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const settingsValuesFrom = (settings: LiteAdminSettings): SettingsFormValues => ({
  site_name: settings.site_name,
  support_email: settings.support_email,
  default_timezone: settings.default_timezone,
  date_format: settings.date_format,
  time_format: settings.time_format,
  currency: settings.currency,
  sign_in_with_duncit: settings.sign_in_with_duncit,
  duncit_graphql_url: settings.duncit_graphql_url,
  duncit_app_url: settings.duncit_app_url,
  reminders_enabled: settings.reminders_enabled,
  reminder_hours_before: settings.reminder_hours_before.join(', '),
  upi_help_text: settings.upi_help_text,
  admin_emails: settings.admin_emails.join(', '),
  max_ticket_price: String(settings.max_ticket_price),
  max_event_capacity: String(settings.max_event_capacity),
  max_seats_per_registration: String(settings.max_seats_per_registration),
  sign_in_with_phone: settings.sign_in_with_phone,
});

export const toSettingsInput = (values: SettingsFormValues): Partial<LiteAdminSettings> => ({
  site_name: values.site_name,
  support_email: values.support_email,
  default_timezone: values.default_timezone,
  date_format: values.date_format,
  time_format: values.time_format,
  currency: values.currency,
  sign_in_with_duncit: values.sign_in_with_duncit,
  duncit_graphql_url: values.duncit_graphql_url,
  duncit_app_url: values.duncit_app_url,
  reminders_enabled: values.reminders_enabled,
  reminder_hours_before: splitList(values.reminder_hours_before).map(Number),
  upi_help_text: values.upi_help_text,
  admin_emails: splitList(values.admin_emails).map((email) => email.toLowerCase()),
  max_ticket_price: Number(values.max_ticket_price),
  max_event_capacity: Number(values.max_event_capacity),
  max_seats_per_registration: Number(values.max_seats_per_registration),
  sign_in_with_phone: values.sign_in_with_phone,
});

export const makeSettingsSchema = (t: Translate) => {
  const required = (field: string) => t('litePortal.validation.required', { vars: { field } });
  const max = (field: string, limit: number) => t('litePortal.validation.max', { vars: { field, max: limit } });
  const url = (field: string) => t('litePortal.validation.url', { vars: { field } });
  const siteName = t('litePortal.settings.siteName');
  const dateFormat = t('litePortal.settings.dateFormat');
  const timeFormat = t('litePortal.settings.timeFormat');
  return z.object({
    site_name: z.string().trim().min(1, required(siteName)).max(80, max(siteName, 80)),
    support_email: z.string().trim().toLowerCase().min(1, required(t('litePortal.settings.supportEmail'))).email(t('litePortal.validation.email')),
    default_timezone: z.string().refine((zone) => TIME_ZONE_SET.has(zone), t('litePortal.validation.timezone')),
    date_format: z.string().trim().min(1, required(dateFormat)).max(40, max(dateFormat, 40)),
    time_format: z.string().trim().min(1, required(timeFormat)).max(40, max(timeFormat, 40)),
    currency: z.string().trim().toUpperCase().regex(CURRENCY, t('litePortal.settings.currencyHint')),
    sign_in_with_duncit: z.boolean(),
    duncit_graphql_url: z.string().trim().refine(isBlankOrHttpUrl, url(t('litePortal.settings.duncitGraphqlUrl'))),
    duncit_app_url: z.string().trim().refine(isBlankOrHttpUrl, url(t('litePortal.settings.duncitAppUrl'))),
    reminders_enabled: z.boolean(),
    reminder_hours_before: z
      .string()
      .trim()
      .refine((text) => text === '' || (HOURS_LIST.test(text) && splitList(text).every((hour) => countIssue(hour, SETTING_BOUNDS.reminderHour) === null)), t('litePortal.validation.hoursList')),
    upi_help_text: z.string().trim().max(500, max(t('litePortal.settings.upiHelpText'), 500)),
    admin_emails: z.string().trim().refine((text) => splitList(text).every((email) => EMAIL.test(email)), t('litePortal.validation.emailsList')),
    max_ticket_price: countRule(t, t('litePortal.settings.maxTicketPrice'), SETTING_BOUNDS.ticketPrice),
    max_event_capacity: countRule(t, t('litePortal.settings.maxEventCapacity'), SETTING_BOUNDS.eventCapacity),
    max_seats_per_registration: countRule(t, t('litePortal.settings.maxSeats'), SETTING_BOUNDS.seatsPerRegistration),
    sign_in_with_phone: z.boolean(),
  });
};
