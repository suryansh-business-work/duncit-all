import { Schema, model, type Document } from 'mongoose';
import type { AnalyticsEntity } from '../entity/shapes';

/**
 * Analytics > Settings > Analytics Mails: who gets the Analytics console's
 * numbers by email, which dashboards, how often, and when the send goes out.
 *
 * A subscriber is an address, not an account: the report is meant for people
 * who read the numbers without signing in to the console, so nothing here
 * requires a Duncit login. Only an Analytics manager can add one.
 */

export type AnalyticsMailFrequency = 'DAILY' | 'WEEKLY';
export const ANALYTICS_MAIL_FREQUENCIES: readonly AnalyticsMailFrequency[] = ['DAILY', 'WEEKLY'];

/** How the last send went — SKIPPED is a deliberate no-send (an email mute, a switched-off template). */
export type AnalyticsMailOutcome = 'SENT' | 'FAILED' | 'SKIPPED';

export interface IAnalyticsMailSubscription extends Document {
  name: string;
  email: string;
  /** The dashboards the report covers, in sidebar order. */
  pages: AnalyticsEntity[];
  frequency: AnalyticsMailFrequency;
  /** The reporting period, the same 7 / 30 / 90 / 365 the dashboards offer. */
  days: number;
  is_active: boolean;
  last_sent_at: Date | null;
  last_status: AnalyticsMailOutcome | null;
  last_error: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const subscriptionSchema = new Schema<IAnalyticsMailSubscription>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    pages: { type: [String], default: [] },
    frequency: { type: String, enum: ANALYTICS_MAIL_FREQUENCIES, default: 'WEEKLY' },
    days: { type: Number, default: 7 },
    is_active: { type: Boolean, default: true },
    last_sent_at: { type: Date, default: null },
    last_status: { type: String, enum: ['SENT', 'FAILED', 'SKIPPED', null], default: null },
    last_error: { type: String, default: '' },
    created_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const AnalyticsMailSubscriptionModel = model<IAnalyticsMailSubscription>(
  'AnalyticsMailSubscription',
  subscriptionSchema
);

/**
 * When the reports go out, as a singleton. OFF until an operator turns it on,
 * like every other scheduled job here: the singleton is created by the first
 * read, and a default of true would start mailing the moment this deploys.
 */
export interface IAnalyticsMailSettings extends Document {
  key: string;
  enabled: boolean;
  /** Wall-clock `HH:mm` in the platform's own time zone (Admin > Settings). */
  time_of_day: string;
  /** 0-6, Sunday first. Read only for WEEKLY subscribers. */
  weekday: number;
  created_at: Date;
  updated_at: Date;
}

const settingsSchema = new Schema<IAnalyticsMailSettings>(
  {
    key: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    // The start of the working day, when a report is read rather than buried.
    time_of_day: { type: String, default: '09:00' },
    weekday: { type: Number, default: 1 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const AnalyticsMailSettingsModel = model<IAnalyticsMailSettings>('AnalyticsMailSettings', settingsSchema);

export const ANALYTICS_MAIL_SETTINGS_KEY = 'analytics_mail';
