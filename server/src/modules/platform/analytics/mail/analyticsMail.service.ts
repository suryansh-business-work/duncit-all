import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { isDue, nextRunAt, parseTimeOfDay } from '@utils/cron-schedule';
import { getAppTimeZone } from '@utils/app-time';
import { isEmailAddress } from '@utils/email';
import { logs } from '@observability/log';
import {
  ANALYTICS_MAIL_FREQUENCIES,
  ANALYTICS_MAIL_SETTINGS_KEY,
  AnalyticsMailSettingsModel,
  AnalyticsMailSubscriptionModel,
  type AnalyticsMailFrequency,
  type IAnalyticsMailSettings,
  type IAnalyticsMailSubscription,
} from './analyticsMail.model';
import { ANALYTICS_ENTITIES, ANALYTICS_MAIL_PERIODS, isAnalyticsEntity } from './analyticsMail.pages';
import { sendAnalyticsReport, sendContext, type SendOutcome } from './analyticsMail.send';
import { sendSubscribedNotice } from './analyticsMail.notice';

export interface AnalyticsMailSettingsInput {
  enabled: boolean;
  time_of_day: string;
  weekday: number;
}

export interface AnalyticsMailSubscriptionInput {
  name: string;
  email: string;
  pages: string[];
  frequency: AnalyticsMailFrequency;
  days: number;
  is_active: boolean;
}

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const FREQUENCIES = new Set<string>(ANALYTICS_MAIL_FREQUENCIES);
const PERIODS = new Set<number>(ANALYTICS_MAIL_PERIODS);

async function settingsDoc(): Promise<IAnalyticsMailSettings> {
  return AnalyticsMailSettingsModel.findOneAndUpdate(
    { key: ANALYTICS_MAIL_SETTINGS_KEY },
    { $setOnInsert: { key: ANALYTICS_MAIL_SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).orFail();
}

const scheduleOf = (settings: IAnalyticsMailSettings, sub: IAnalyticsMailSubscription) => ({
  enabled: settings.enabled && sub.is_active,
  frequency: sub.frequency,
  time_of_day: settings.time_of_day,
  weekday: settings.weekday,
});

/** The subscription as the API returns it, with the next send the schedule owes it. */
function present(sub: IAnalyticsMailSubscription, settings: IAnalyticsMailSettings, now = new Date()) {
  const next = nextRunAt(scheduleOf(settings, sub), now, getAppTimeZone());
  return {
    id: String(sub._id),
    name: sub.name,
    email: sub.email,
    pages: sub.pages,
    frequency: sub.frequency,
    days: sub.days,
    is_active: sub.is_active,
    last_sent_at: sub.last_sent_at?.toISOString() ?? null,
    last_status: sub.last_status,
    last_error: sub.last_error || null,
    next_send_at: next?.toISOString() ?? null,
    created_at: sub.created_at.toISOString(),
  };
}

/** A clean input, or a thrown error naming the first thing wrong with it. */
function cleanInput(input: AnalyticsMailSubscriptionInput) {
  const name = input.name?.trim() ?? '';
  const email = input.email?.trim().toLowerCase() ?? '';
  if (!name || name.length > 120) throw badInput('Enter a name of up to 120 characters.');
  if (!isEmailAddress(email)) throw badInput('Enter a valid email address.');
  const pages = new Set(input.pages);
  if (pages.size === 0) throw badInput('Pick at least one dashboard.');
  if (![...pages].every(isAnalyticsEntity)) throw badInput('One of the dashboards is not one this console has.');
  if (!FREQUENCIES.has(input.frequency)) throw badInput('Pick daily or weekly.');
  if (!PERIODS.has(input.days)) throw badInput('Pick a reporting period of 7, 30, 90 or 365 days.');
  return {
    name,
    email,
    // Stored in sidebar order, whatever order they were ticked in.
    pages: ANALYTICS_ENTITIES.filter((entity) => pages.has(entity)),
    frequency: input.frequency,
    days: input.days,
    is_active: Boolean(input.is_active),
  };
}

async function requireSubscription(id: string): Promise<IAnalyticsMailSubscription> {
  if (!Types.ObjectId.isValid(id)) throw badInput('Unknown subscriber.');
  const sub = await AnalyticsMailSubscriptionModel.findById(id);
  if (!sub) throw new GraphQLError('Subscriber not found', { extensions: { code: 'NOT_FOUND' } });
  return sub;
}

/** A second row for one address would mail that person every report twice. */
async function assertUnique(email: string, exceptId?: string): Promise<void> {
  const clash = await AnalyticsMailSubscriptionModel.findOne({ email, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })
    .select('_id')
    .lean();
  if (clash) throw badInput('That address is already subscribed.');
}

export const analyticsMailService = {
  async settings() {
    const doc = await settingsDoc();
    return { enabled: doc.enabled, time_of_day: doc.time_of_day, weekday: doc.weekday, time_zone: getAppTimeZone() };
  },

  async updateSettings(input: AnalyticsMailSettingsInput) {
    if (!parseTimeOfDay(input.time_of_day)) throw badInput('Enter the time as HH:mm.');
    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) throw badInput('Pick a weekday.');
    await AnalyticsMailSettingsModel.updateOne(
      { key: ANALYTICS_MAIL_SETTINGS_KEY },
      { $set: { enabled: Boolean(input.enabled), time_of_day: input.time_of_day.trim(), weekday: input.weekday } },
      { upsert: true }
    ).exec();
    return this.settings();
  },

  async list() {
    const [settings, subs] = await Promise.all([
      settingsDoc(),
      AnalyticsMailSubscriptionModel.find().sort({ created_at: -1 }),
    ]);
    return subs.map((sub) => present(sub, settings));
  },

  async create(input: AnalyticsMailSubscriptionInput, createdBy: string) {
    const clean = cleanInput(input);
    await assertUnique(clean.email);
    const [sub, settings] = await Promise.all([
      AnalyticsMailSubscriptionModel.create({ ...clean, created_by: createdBy }),
      settingsDoc(),
    ]);
    // A subscriber hears about it at once — who added them, and where to read
    // the numbers — rather than from a report that arrives unannounced.
    sendSubscribedNotice(sub, settings).catch((err) => {
      logs.server.error('analytics-mail', 'subscribed-notice', { error: err, to: sub.email, msg: 'notice failed' });
    });
    return present(sub, settings);
  },

  async update(id: string, input: AnalyticsMailSubscriptionInput) {
    const clean = cleanInput(input);
    await requireSubscription(id);
    await assertUnique(clean.email, id);
    const [sub, settings] = await Promise.all([
      AnalyticsMailSubscriptionModel.findByIdAndUpdate(id, { $set: clean }, { new: true }).orFail(),
      settingsDoc(),
    ]);
    return present(sub, settings);
  },

  async remove(id: string) {
    await requireSubscription(id);
    await AnalyticsMailSubscriptionModel.deleteOne({ _id: id }).exec();
    return true;
  },

  /** The report, right now, whatever the schedule says — how an operator checks what a subscriber receives. */
  async sendNow(id: string): Promise<{ ok: boolean; message: string }> {
    const sub = await requireSubscription(id);
    const outcome: SendOutcome = await sendAnalyticsReport(sub, sendContext());
    return { ok: outcome.status === 'SENT', message: outcome.reason };
  },

  /**
   * Send every report the schedule owes. A subscriber's first report is the
   * first slot AFTER they were added — not the one that passed this morning —
   * and each row is claimed before it is sent, so a slow send is never picked
   * up again by the next tick.
   */
  async runIfDue(now: Date = new Date()): Promise<number> {
    const settings = await settingsDoc();
    if (!settings.enabled) return 0;
    const zone = getAppTimeZone();
    const subs = await AnalyticsMailSubscriptionModel.find({ is_active: true });
    const ctx = sendContext();
    let sent = 0;
    for (const sub of subs) {
      if (!isDue(scheduleOf(settings, sub), sub.last_sent_at ?? sub.created_at, now, zone)) continue;
      const claimed = await AnalyticsMailSubscriptionModel.updateOne(
        { _id: sub._id, last_sent_at: sub.last_sent_at },
        { $set: { last_sent_at: now } }
      ).exec();
      if (claimed.modifiedCount === 0) continue;
      await sendAnalyticsReport(sub, ctx, now);
      sent += 1;
    }
    return sent;
  },
};
