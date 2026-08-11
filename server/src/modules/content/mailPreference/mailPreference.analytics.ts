import { UserModel } from '@modules/access/user/user.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { MAIL_PREFERENCE_CATEGORIES, OPTIONAL_MAIL_CATEGORIES } from './mailPreference.categories';
import { MailPreferenceEventModel, MailPreferenceModel } from './mailPreference.model';

/**
 * What the opt-out log says, for the Marketing portal.
 *
 * Two different questions, and they need two different sources. "How many people
 * are unreachable right now" is the state — the preference documents. "What
 * happened this week, to whom, from where" is the history — the event rows. A
 * report built on state alone cannot see somebody who opted out and came back,
 * which is the single most useful thing a campaign can learn about itself.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const MAIL_PREFERENCE_LOG_CONFIG: TableEntityConfig = {
  searchFields: ['email', 'category', 'source_detail'],
  sortFields: {
    email: 'email',
    category: 'category',
    enabled: 'enabled',
    source: 'source',
    created_at: 'created_at',
  },
  filterFields: {
    category: { type: 'enum' },
    enabled: { type: 'boolean' },
    source: { type: 'enum' },
    email: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** The window the report reads, never the number the client sent. */
function clampRange(input?: number | null): number {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(365, n);
}

/** Opt-outs and opt-ins in the window, grouped by one key. */
async function eventsBy(since: Date, groupBy: string) {
  return MailPreferenceEventModel.aggregate<{
    _id: { key: string | null; enabled: boolean };
    count: number;
  }>([
    { $match: { created_at: { $gte: since } } },
    { $group: { _id: { key: groupBy, enabled: '$enabled' }, count: { $sum: 1 } } },
  ]);
}

/** How many addresses are currently opted out of each category. */
async function currentByCategory(): Promise<Map<string, number>> {
  const rows = await MailPreferenceModel.aggregate<{ _id: string; count: number }>([
    { $unwind: '$opted_out' },
    { $group: { _id: '$opted_out', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
}

/** The name behind each address on this page, so the table reads as people. */
async function namesFor(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: userIds } })
    .select('profile.first_name profile.last_name')
    .lean();
  return new Map(
    users.map((user: any) => [
      String(user._id),
      [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' '),
    ])
  );
}

export const mailPreferenceAnalytics = {
  /**
   * The headline picture over a window.
   *
   * `people_opted_out_all` is counted separately from the per-category numbers
   * because it is a different kind of bad news: somebody who switched off one
   * category is still reachable, and somebody who switched off all of them is
   * gone.
   */
  async summary(rangeDays?: number | null) {
    const days = clampRange(rangeDays);
    const since = new Date(Date.now() - days * DAY_MS);
    const [byCategoryEvents, bySourceEvents, currentCounts, peopleOptedOut, peopleOptedOutAll] =
      await Promise.all([
        eventsBy(since, '$category'),
        eventsBy(since, '$source'),
        currentByCategory(),
        MailPreferenceModel.countDocuments({ 'opted_out.0': { $exists: true } }),
        MailPreferenceModel.countDocuments({ opted_out: { $all: OPTIONAL_MAIL_CATEGORIES } }),
      ]);

    const count = (rows: typeof byCategoryEvents, key: string, enabled: boolean) =>
      rows
        .filter((row) => row._id.key === key && row._id.enabled === enabled)
        .reduce((sum, row) => sum + row.count, 0);

    const by_category = MAIL_PREFERENCE_CATEGORIES.map((mailCategory) => ({
      category: mailCategory,
      opted_out_now: currentCounts.get(mailCategory) ?? 0,
      opt_outs: count(byCategoryEvents, mailCategory, false),
      opt_ins: count(byCategoryEvents, mailCategory, true),
    }));

    const sources = [...new Set(bySourceEvents.map((row) => row._id.key ?? 'SERVER'))];
    const by_source = sources
      .map((key) => ({
        key,
        count: count(bySourceEvents, key, false) + count(bySourceEvents, key, true),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      range_days: days,
      people_opted_out: peopleOptedOut,
      people_opted_out_all: peopleOptedOutAll,
      opt_outs: by_category.reduce((sum, row) => sum + row.opt_outs, 0),
      opt_ins: by_category.reduce((sum, row) => sum + row.opt_ins, 0),
      by_category,
      by_source,
    };
  },

  /** Every change anyone has ever made, newest first. */
  async logsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery(
      MailPreferenceEventModel,
      {},
      input,
      MAIL_PREFERENCE_LOG_CONFIG
    );
    const names = await namesFor(
      docs.map((doc: any) => (doc.user_id ? String(doc.user_id) : '')).filter(Boolean)
    );
    return {
      rows: docs.map((doc: any) => ({
        id: String(doc._id),
        email: doc.email,
        user_id: doc.user_id ? String(doc.user_id) : null,
        user_name: names.get(String(doc.user_id)) ?? '',
        category: doc.category,
        enabled: doc.enabled,
        source: doc.source,
        source_detail: doc.source_detail ?? '',
        created_at: doc.created_at?.toISOString() ?? null,
      })),
      total,
      page,
      page_size,
    };
  },
};
