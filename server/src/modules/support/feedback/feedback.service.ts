import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import {
  DEFAULT_CATEGORIES,
  FeedbackReportModel,
  ReportProblemConfigModel,
  nextReportNo,
  type IFeedbackReport,
} from './feedback.model';

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Recorded on the row when Support has switched the announcement off, so the
 * queue can tell "nobody looked" from "nobody was told". */
const SLACK_OFF = 'Slack announcements are switched off for Report a Problem';

/** The reporter's phone as one dialable string, or '' when they have none —
 * phone is optional on an account since signup stopped collecting it. */
const phoneOf = (profile: any): string => {
  const phone = profile?.auth?.phone;
  const number = clean(phone?.number);
  if (!number) return '';
  const ext = clean(phone?.extension);
  return ext ? `${ext} ${number}` : number;
};

const toPub = (d: IFeedbackReport) => ({
  id: String(d._id),
  report_no: d.report_no,
  user_id: d.user_id ? String(d.user_id) : null,
  user_name: d.user_name ?? '',
  user_email: d.user_email ?? '',
  category: d.category,
  message: d.message,
  media_urls: d.media_urls ?? [],
  reporter_phone: d.reporter_phone ?? '',
  reporter_city: d.reporter_city ?? '',
  reporter_locale: d.reporter_locale ?? '',
  reporter_roles: d.reporter_roles ?? [],
  platform: d.platform ?? 'app',
  app_version: d.app_version ?? '',
  device_os: d.device_os ?? '',
  device_model: d.device_model ?? '',
  source_screen: d.source_screen ?? '',
  status: d.status,
  slack_ts: d.slack_ts ?? null,
  slack_error: d.slack_error ?? null,
  created_at: d.created_at.toISOString(),
  updated_at: d.updated_at.toISOString(),
});

/** Allowlists for the shared table engine (DUNCIT TABLE CONTRACT v1). */
const FEEDBACK_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['report_no', 'user_name', 'user_email', 'category', 'message'],
  sortFields: {
    report_no: 'report_no',
    user_name: 'user_name',
    category: 'category',
    platform: 'platform',
    status: 'status',
    created_at: 'created_at',
  },
  filterFields: {
    category: { type: 'string' },
    platform: { type: 'string' },
    status: { type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/**
 * Announce a SAVED report on Slack, recording the outcome on the row.
 *
 * Never throws: the report is already filed by the time this runs, and a Slack
 * outage that cost the reporter their report is the bug this whole order of
 * operations exists to prevent.
 */
async function announce(
  doc: IFeedbackReport,
  report: {
    category: string;
    message: string;
    who: string;
    media_urls: string[];
    blocks_json: string | null;
    channel: string | null;
  }
) {
  try {
    const { slackService } = await import('@modules/platform/slack/slack.service');
    const result = await slackService.announceFeedback({
      ...report,
      report_no: doc.report_no,
      platform: doc.platform,
    });
    doc.slack_ts = result?.ts ?? null;
    doc.slack_error = result?.skipped ?? null;
  } catch (err) {
    doc.slack_error = err instanceof Error ? err.message : 'Slack announcement failed';
    logs.server.warn('feedback.service', 'submit', {
      error: err,
      msg: 'slack announcement failed; report still saved',
      report_no: doc.report_no,
    });
  }
}

export const feedbackService = {
  /**
   * Record a problem report, then TRY to announce it on Slack.
   *
   * The order is the fix. Feedback used to be a Slack-only side effect: an
   * unconfigured channel threw before anything was written, so the report was
   * not merely unannounced, it was discarded — and there was nowhere for
   * Support to read it even when Slack worked. The row below is the store of
   * record; Slack is a notification whose failure is recorded on the row and
   * never costs the user their report.
   */
  async submit(
    user: { id: string; email?: string | null },
    input: {
      category?: string | null;
      message?: string | null;
      platform?: string | null;
      app_version?: string | null;
      media_urls?: string[] | null;
      device_os?: string | null;
      device_model?: string | null;
      source_screen?: string | null;
      blocks_json?: string | null;
    }
  ) {
    const category = clean(input.category);
    const message = clean(input.message);
    if (!category) throw badInput('Pick a category');

    const settings = await this.configDoc();
    if (message.length < settings.message_min_length) {
      throw badInput(`Please write at least ${settings.message_min_length} characters`);
    }

    const media = (input.media_urls ?? []).map(clean).filter(Boolean).slice(0, settings.max_media);

    const profile = await UserModel.findById(user.id).select('profile.first_name profile.last_name profile.city profile.locale auth.email auth.phone metadata.role_keys').lean();
    const name = `${(profile as any)?.profile?.first_name ?? ''} ${(profile as any)?.profile?.last_name ?? ''}`.trim();

    const doc = await FeedbackReportModel.create({
      report_no: await nextReportNo(),
      user_id: new Types.ObjectId(user.id),
      user_name: name,
      user_email: clean(user.email) || clean((profile as any)?.auth?.email),
      category,
      message,
      media_urls: media,
      reporter_phone: phoneOf(profile),
      reporter_city: clean((profile as any)?.profile?.city),
      reporter_locale: clean((profile as any)?.profile?.locale),
      reporter_roles: (profile as any)?.metadata?.role_keys ?? [],
      platform: clean(input.platform) || 'app',
      app_version: clean(input.app_version),
      device_os: clean(input.device_os),
      device_model: clean(input.device_model),
      source_screen: clean(input.source_screen),
    });

    // Best effort from here. Anything that goes wrong is written to the row.
    // Switched off is not a failure, but it IS the answer to "why was this never
    // announced?", so Support reads it in the same place a failure is read.
    if (settings.slack_enabled === false) {
      doc.slack_error = SLACK_OFF;
    } else {
      await announce(doc, {
        category,
        message,
        who: doc.user_email || doc.user_name || user.id,
        media_urls: media,
        blocks_json: input.blocks_json ?? null,
        channel: settings.slack_channel_id || null,
      });
    }
    await doc.save();

    return toPub(doc);
  },

  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IFeedbackReport>(
      FeedbackReportModel,
      {},
      input,
      FEEDBACK_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async byId(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await FeedbackReportModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  async setStatus(id: string, status: string) {
    const doc = await FeedbackReportModel.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    if (!doc) throw new GraphQLError('Report not found', { extensions: { code: 'NOT_FOUND' } });
    return toPub(doc);
  },

  /** The singleton document, seeded on first read so a fresh install renders
   * the same four chips the app used to hardcode. */
  async configDoc() {
    return ReportProblemConfigModel.findOneAndUpdate(
      { singleton_key: 'report_problem' },
      { $setOnInsert: { categories: DEFAULT_CATEGORIES } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  },

  /** What the app renders. Readable by every signed-in user, which is why the
   * Slack routing below is deliberately NOT part of it. */
  async config() {
    const doc = await this.configDoc();
    return {
      categories: (doc.categories ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
      message_label: doc.message_label,
      message_hint: doc.message_hint,
      message_min_length: doc.message_min_length,
      allow_media: doc.allow_media,
      max_media: doc.max_media,
    };
  },

  async updateConfig(input: any) {
    const set: Record<string, unknown> = {};
    if (Array.isArray(input?.categories)) {
      const seen = new Set<string>();
      set.categories = input.categories
        .map((row: any, index: number) => ({
          // A stable key means renaming a label never orphans the reports that
          // were already filed under it.
          key: clean(row?.key) || clean(row?.label).toUpperCase().replaceAll(/[^A-Z0-9]+/g, '_'),
          label: clean(row?.label),
          is_active: row?.is_active !== false,
          sort_order: Number.isFinite(row?.sort_order) ? Number(row.sort_order) : index,
        }))
        .filter((row: any) => {
          if (!row.key || !row.label || seen.has(row.key)) return false;
          seen.add(row.key);
          return true;
        });
      if ((set.categories as unknown[]).length === 0) {
        throw badInput('Keep at least one category');
      }
    }
    for (const key of ['message_label', 'message_hint'] as const) {
      if (typeof input?.[key] === 'string') set[key] = clean(input[key]);
    }
    if (Number.isFinite(input?.message_min_length)) {
      set.message_min_length = Math.max(1, Math.floor(Number(input.message_min_length)));
    }
    if (typeof input?.allow_media === 'boolean') set.allow_media = input.allow_media;
    if (Number.isFinite(input?.max_media)) {
      set.max_media = Math.min(10, Math.max(1, Math.floor(Number(input.max_media))));
    }

    await ReportProblemConfigModel.findOneAndUpdate(
      { singleton_key: 'report_problem' },
      { $set: set, $setOnInsert: { categories: DEFAULT_CATEGORIES } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return this.config();
  },

  /**
   * Where reports are announced, plus the channels there are to choose from.
   *
   * The channel list is fetched here rather than through `slackChannels`
   * because that query is a Tech-portal capability; Support may pick where its
   * own reports land without being handed the Slack console. A workspace that
   * cannot be reached answers with an empty list and the reason, so the page
   * still renders the switch and the channel already chosen.
   */
  async slackSettings() {
    const doc = await this.configDoc();
    const chosen = {
      enabled: doc.slack_enabled !== false,
      channel_id: doc.slack_channel_id ?? '',
      channel_name: doc.slack_channel_name ?? '',
    };
    const { slackService } = await import('@modules/platform/slack/slack.service');
    if (!(await slackService.configured())) {
      return { ...chosen, slack_configured: false, channels: [], error: '' };
    }
    try {
      const channels = await slackService.channels();
      return { ...chosen, slack_configured: true, channels, error: '' };
    } catch (err) {
      return {
        ...chosen,
        slack_configured: true,
        channels: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async updateSlack(input: {
    enabled?: boolean | null;
    channel_id?: string | null;
    channel_name?: string | null;
  }) {
    const set: Record<string, unknown> = {};
    if (typeof input?.enabled === 'boolean') set.slack_enabled = input.enabled;
    if (typeof input?.channel_id === 'string') set.slack_channel_id = clean(input.channel_id);
    if (typeof input?.channel_name === 'string') set.slack_channel_name = clean(input.channel_name);
    await ReportProblemConfigModel.findOneAndUpdate(
      { singleton_key: 'report_problem' },
      { $set: set, $setOnInsert: { categories: DEFAULT_CATEGORIES } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return this.slackSettings();
  },
};
