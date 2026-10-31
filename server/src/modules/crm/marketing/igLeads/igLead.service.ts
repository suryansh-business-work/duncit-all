import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { IgLeadModel, IgLeadSearchModel, type IgLeadDoc, type IgLeadSearchDoc } from './igLead.model';
import { expireStaleSearches, startSearch, type StartSearchInput } from './igLead.search';
import { deleteLead, draftMessage, loadSettings, markSent, saveSettings, sentToday, setStatus, type IgLeadSettingsInput } from './igLead.outreach';
import { serperReady } from './igLead.serper';
import { discoveryReady } from './igLead.discovery';
import { CLOSED_STATUSES, type IgLeadStatus } from './igLead.types';

/** Allowlists for the shared table engine (DUNCIT TABLE CONTRACT v1). */
const LEAD_TABLE: TableEntityConfig = {
  searchFields: ['username', 'name', 'bio', 'emails', 'phones'],
  sortFields: {
    username: 'username',
    followers: 'followers',
    fit_score: 'fit_score',
    status: 'status',
    next_follow_up_at: 'next_follow_up_at',
    last_contacted_at: 'last_contacted_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    followers: { type: 'number' },
    fit_score: { type: 'number' },
    next_follow_up_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { fit_score: -1, created_at: -1 },
};
const SEARCH_LIST_LIMIT = 20;

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);

/** The schemas' own fields plus the timestamp the `timestamps` option adds. */
type LeadRow = IgLeadDoc & { created_at?: Date | null };
type SearchRow = IgLeadSearchDoc & { created_at?: Date | null };

const pubLead = (o: LeadRow) => ({
  id: String(o._id),
  username: o.username,
  name: o.name ?? '',
  bio: o.bio ?? '',
  website: o.website ?? '',
  followers: o.followers ?? null,
  media_count: o.media_count ?? null,
  profile_picture_url: o.profile_picture_url ?? '',
  profile_url: `https://www.instagram.com/${o.username}/`,
  emails: o.emails ?? [],
  phones: o.phones ?? [],
  fit_score: o.fit_score ?? null,
  fit_reason: o.fit_reason ?? '',
  status: o.status,
  draft: o.draft ?? '',
  draft_step: o.draft_step ?? null,
  messages: (o.messages ?? []).map((m) => ({ step: m.step, text: m.text, sent_at: iso(m.sent_at) })),
  next_follow_up_at: iso(o.next_follow_up_at),
  last_contacted_at: iso(o.last_contacted_at),
  replied_at: iso(o.replied_at),
  created_at: iso(o.created_at),
});

const pubSearch = (o: SearchRow) => ({
  id: String(o._id),
  brief: o.brief,
  max_results: o.max_results,
  summary: o.summary ?? '',
  queries: o.queries ?? [],
  status: o.status,
  found: o.found ?? 0,
  added: o.added ?? 0,
  skipped: o.skipped ?? 0,
  error: o.error ?? '',
  created_at: iso(o.created_at),
  finished_at: iso(o.finished_at),
});

export const igLeadService = {
  /** `due` narrows to leads whose next follow-up is now or overdue. */
  async table(input?: TableQueryInput | null, due?: boolean | null) {
    const base = due ? { next_follow_up_at: { $ne: null, $lte: new Date() }, status: { $nin: CLOSED_STATUSES } } : {};
    const { docs, total, page, page_size } = await runTableQuery<LeadRow>(IgLeadModel, base, input, LEAD_TABLE);
    return { rows: docs.map(pubLead), total, page, page_size };
  },

  async searches() {
    await expireStaleSearches();
    const docs = await IgLeadSearchModel.find().sort({ created_at: -1 }).limit(SEARCH_LIST_LIMIT).lean();
    return docs.map(pubSearch);
  },

  async start(input: StartSearchInput, userId: string) {
    return pubSearch(await startSearch(input, userId));
  },

  /** The settings, plus what the page needs to say before anyone presses a button. */
  async settings() {
    const [doc, sent, serper, instagram] = await Promise.all([loadSettings(), sentToday(), serperReady(), discoveryReady()]);
    return {
      max_follow_ups: doc.max_follow_ups,
      follow_up_gap_days: doc.follow_up_gap_days,
      daily_send_limit: doc.daily_send_limit,
      pitch: doc.pitch ?? '',
      sent_today: sent,
      serper_ready: serper,
      instagram_ready: instagram,
    };
  },

  async saveSettings(input: IgLeadSettingsInput, userId: string) {
    await saveSettings(input, userId);
    return this.settings();
  },

  async draft(id: string) {
    return pubLead(await draftMessage(id));
  },

  async markSent(id: string, message: string, userId: string) {
    return pubLead(await markSent(id, message, userId));
  },

  async setStatus(id: string, status: IgLeadStatus) {
    return pubLead(await setStatus(id, status));
  },

  remove: deleteLead,
};
