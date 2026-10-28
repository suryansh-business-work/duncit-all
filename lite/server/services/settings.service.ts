import { SETTING_BOUNDS } from '../../shared/limits';
import { env } from '../config/env';
import { DEFAULT_PICTURE_TOPICS, LiteSettingsModel, type LiteSettings } from '../models/settings.model';
import { envEntryService, readString } from './envEntry.service';
import { badInput } from '../utils/errors';
import { cleanText, normalizeEmail, validTimezone, wholeNumber } from '../utils/validate';

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
  max_event_capacity?: number | null;
  max_seats_per_registration?: number | null;
  sign_in_with_phone?: boolean | null;
  picture_topics?: string[] | null;
}

export { SETTING_BOUNDS };

const MAX_PICTURE_TOPICS = 40;
const MAX_TOPIC_LENGTH = 40;

/** Trimmed, non-blank and distinct (ignoring case), in the order given; an empty list switches topics off. */
function pictureTopics(requested: string[]): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const raw of requested) {
    const topic = cleanText(raw, MAX_TOPIC_LENGTH, 'Picture topic');
    if (topic && !seen.has(topic.toLowerCase())) {
      seen.add(topic.toLowerCase());
      topics.push(topic);
    }
  }
  if (topics.length > MAX_PICTURE_TOPICS) throw badInput(`Give at most ${MAX_PICTURE_TOPICS} picture topics`);
  return topics;
}

/** The part of an update that touches the picture topics, kept out of `update` so it stays readable. */
const pictureTopicsSet = (input: AdminSettingsInput): Record<string, unknown> => (input.picture_topics == null ? {} : { picture_topics: pictureTopics(input.picture_topics) });

/** A row saved before the field existed is read lean, without the schema default. */
const topicsOf = (settings: LiteSettings): string[] => settings.picture_topics ?? [...DEFAULT_PICTURE_TOPICS];

/** Whole, distinct reminder hours in 1–720, latest first; at least one is required. */
function reminderHours(requested: number[]): number[] {
  if (requested.length === 0) throw badInput('Give at least one reminder hour between 1 and 720');
  const hours = [...new Set(requested.map((h) => wholeNumber(h, 'Reminder hour', SETTING_BOUNDS.reminderHour)))];
  hours.sort((a, b) => b - a);
  return hours;
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
    const [google, maps, msg91] = await Promise.all([
      envEntryService.activeConfig('GOOGLE_OAUTH'),
      envEntryService.activeConfig('GOOGLE_MAPS'),
      envEntryService.activeConfig('MSG91'),
    ]);
    const smsReady = Boolean(readString(msg91, 'widget_id') && readString(msg91, 'auth_key'));
    return {
      site_name: settings.site_name,
      support_email: settings.support_email,
      default_timezone: settings.default_timezone,
      currency: settings.currency,
      google_client_id: readString(google, 'client_id'),
      sign_in_with_duncit: settings.sign_in_with_duncit,
      // Only ever the browser key (restricted by referrer) and the switch — never the MSG91 auth key.
      maps_api_key: readString(maps, 'api_key'),
      maps_map_id: readString(maps, 'map_id'),
      phone_sign_in: Boolean(settings.sign_in_with_phone) && smsReady,
      default_country_code: readString(msg91, 'default_country_code') || '91',
      max_ticket_price: settings.max_ticket_price ?? 0,
      max_event_capacity: settings.max_event_capacity ?? SETTING_BOUNDS.eventCapacity.max,
      max_seats_per_registration: settings.max_seats_per_registration ?? 10,
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
      picture_topics: topicsOf(settings),
    };
  },

  /** The topics the picture picker lists. */
  async pictureTopics(): Promise<string[]> {
    return topicsOf(await this.get());
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
    if (input.reminder_hours_before != null) $set.reminder_hours_before = reminderHours(input.reminder_hours_before);
    if (input.upi_help_text != null) $set.upi_help_text = cleanText(input.upi_help_text, 500, 'UPI help text');
    if (input.admin_emails != null) $set.admin_emails = [...new Set(input.admin_emails.map(normalizeEmail))];
    if (input.max_ticket_price != null) $set.max_ticket_price = wholeNumber(input.max_ticket_price, 'Highest ticket price', SETTING_BOUNDS.ticketPrice);
    if (input.max_event_capacity != null) $set.max_event_capacity = wholeNumber(input.max_event_capacity, 'Largest event capacity', SETTING_BOUNDS.eventCapacity);
    if (input.max_seats_per_registration != null) {
      $set.max_seats_per_registration = wholeNumber(input.max_seats_per_registration, 'Seats per registration', SETTING_BOUNDS.seatsPerRegistration);
    }
    if (input.sign_in_with_phone != null) $set.sign_in_with_phone = input.sign_in_with_phone;
    Object.assign($set, pictureTopicsSet(input));
    await LiteSettingsModel.updateOne({ key: 'global' }, { $set }, { upsert: true });
    cache = null;
    return this.adminSettings();
  },
};
