import { env } from '../config/env';
import { LiteSettingsModel, type LiteSettings } from '../models/settings.model';
import { envEntryService, readString } from './envEntry.service';
import { badInput } from '../utils/errors';
import { cleanText, normalizeEmail, validTimezone } from '../utils/validate';

const TTL_MS = 15_000;
let cache: { at: number; value: LiteSettings } | null = null;

export interface AdminSettingsInput {
  site_name?: string | null;
  support_email?: string | null;
  default_timezone?: string | null;
  date_format?: string | null;
  time_format?: string | null;
  currency?: string | null;
  sign_in_with_duncit?: boolean | null;
  duncit_graphql_url?: string | null;
  duncit_app_url?: string | null;
  reminders_enabled?: boolean | null;
  reminder_hours_before?: number[] | null;
  upi_help_text?: string | null;
  admin_emails?: string[] | null;
  max_ticket_price?: number | null;
}

export const settingsService = {
  async seed(): Promise<void> {
    await LiteSettingsModel.updateOne({ key: 'global' }, { $setOnInsert: { key: 'global' } }, { upsert: true });
    if (env.adminEmails.length > 0) {
      await LiteSettingsModel.updateOne({ key: 'global' }, { $addToSet: { admin_emails: { $each: env.adminEmails } } });
    }
    cache = null;
  },

  async get(): Promise<LiteSettings> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
    const doc = await LiteSettingsModel.findOne({ key: 'global' }).lean();
    const value = (doc ?? new LiteSettingsModel({ key: 'global' }).toObject()) as LiteSettings;
    cache = { at: Date.now(), value };
    return value;
  },

  /** The main API a Duncit sign-in is proved against: the console's value, else the deploy's. */
  async duncitGraphqlUrl(): Promise<string> {
    const settings = await this.get();
    return settings.duncit_graphql_url || env.duncitGraphqlUrl;
  },

  async publicSettings() {
    const settings = await this.get();
    const google = await envEntryService.activeConfig('GOOGLE_OAUTH');
    return {
      site_name: settings.site_name,
      support_email: settings.support_email,
      default_timezone: settings.default_timezone,
      currency: settings.currency,
      google_client_id: readString(google, 'client_id'),
      sign_in_with_duncit: settings.sign_in_with_duncit,
      upi_help_text: settings.upi_help_text,
      duncit_app_url: settings.duncit_app_url || env.duncitAppUrl,
    };
  },

  async adminSettings() {
    const settings = await this.get();
    return {
      ...settings,
      duncit_graphql_url: settings.duncit_graphql_url || env.duncitGraphqlUrl,
      duncit_app_url: settings.duncit_app_url || env.duncitAppUrl,
      reminder_hours_before: settings.reminder_hours_before ?? [],
      admin_emails: settings.admin_emails ?? [],
    };
  },

  async update(input: AdminSettingsInput) {
    const $set: Record<string, unknown> = {};
    if (input.site_name != null) $set.site_name = cleanText(input.site_name, 60, 'Site name', true);
    if (input.support_email != null) $set.support_email = normalizeEmail(input.support_email);
    if (input.default_timezone != null) $set.default_timezone = validTimezone(input.default_timezone);
    if (input.date_format != null) $set.date_format = cleanText(input.date_format, 40, 'Date format', true);
    if (input.time_format != null) $set.time_format = cleanText(input.time_format, 40, 'Time format', true);
    if (input.currency != null) $set.currency = cleanText(input.currency, 3, 'Currency', true).toUpperCase();
    if (input.sign_in_with_duncit != null) $set.sign_in_with_duncit = input.sign_in_with_duncit;
    if (input.duncit_graphql_url != null) $set.duncit_graphql_url = cleanText(input.duncit_graphql_url, 300, 'Duncit GraphQL URL');
    if (input.duncit_app_url != null) $set.duncit_app_url = cleanText(input.duncit_app_url, 300, 'Duncit app URL');
    if (input.reminders_enabled != null) $set.reminders_enabled = input.reminders_enabled;
    if (input.reminder_hours_before != null) {
      const hours = [...new Set(input.reminder_hours_before.map((h) => Math.trunc(h)).filter((h) => h > 0 && h <= 720))];
      if (hours.length === 0) throw badInput('Give at least one reminder hour between 1 and 720');
      $set.reminder_hours_before = hours.sort((a, b) => b - a);
    }
    if (input.upi_help_text != null) $set.upi_help_text = cleanText(input.upi_help_text, 500, 'UPI help text');
    if (input.admin_emails != null) $set.admin_emails = [...new Set(input.admin_emails.map(normalizeEmail))];
    if (input.max_ticket_price != null) $set.max_ticket_price = Math.max(0, Math.trunc(input.max_ticket_price));
    await LiteSettingsModel.updateOne({ key: 'global' }, { $set }, { upsert: true });
    cache = null;
    return this.adminSettings();
  },
};
