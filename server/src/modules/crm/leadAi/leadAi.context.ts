import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { LEAD_MODELS } from '@modules/crm/crm/crm.service';
import type { CrmLeadEntityType } from '@modules/crm/crm/crm.constants';
import { CommunicationLogModel } from '@modules/crm/communicationLog/communicationLog.model';
import { ReminderModel } from '@modules/crm/reminder/reminder.model';
import { WebsitePageModel } from '@modules/crm/websitePage/websitePage.model';
import { estimateTokens } from '@services/ai/token-estimate';
import { policyHtmlToText as htmlToText } from '@services/policy/policy.pdf';
import { appDateTime } from '@utils/app-time';

/**
 * What the Ask AI panel knows about one lead, and how much of it there is.
 *
 * Every source is read fresh when the panel opens and again on every question,
 * so a note added a minute ago is already in the next answer. Each source has
 * its own character budget so one long call transcript can never crowd the
 * lead's own profile out of the model's window; `truncated` tells the panel
 * when a budget cut something off.
 */
export const LEAD_AI_SOURCE_KEYS = [
  'profile',
  'notes',
  'activity',
  'emails',
  'calls',
  'reminders',
  'website',
] as const;
export type LeadAiSourceKey = (typeof LEAD_AI_SOURCE_KEYS)[number] | 'conversation';

export interface LeadAiSource {
  key: LeadAiSourceKey;
  items: number;
  chars: number;
  tokens: number;
  truncated: boolean;
}

export interface LeadAiReminderRef {
  id: string;
  title: string;
  status: string;
}

export interface LeadAiContext {
  text: string;
  sources: LeadAiSource[];
  lead: { display_name: string; primary_email: string };
  reminders: LeadAiReminderRef[];
}

/** Character budget per source (≈ 4 characters per token). */
const BUDGET: Record<(typeof LEAD_AI_SOURCE_KEYS)[number], number> = {
  profile: 6000,
  notes: 6000,
  activity: 3000,
  emails: 8000,
  calls: 8000,
  reminders: 3000,
  website: 10000,
};

/** Rows read per source — enough history for any real lead, bounded for the query. */
const ROW_LIMIT = { notes: 40, activity: 40, emails: 25, calls: 15, reminders: 50, website: 15 } as const;
/** One email body or one transcript never takes more than this on its own. */
const ENTRY_CAP = 1200;

const NAME_FIELD: Record<CrmLeadEntityType, string> = {
  VENUE_LEAD: 'venue_name',
  HOST_LEAD: 'host_name',
  ECOMM_LEAD: 'seller_name',
  CREATOR_LEAD: 'creator_name',
  COMMUNITY_LEAD: 'community_name',
};

export const LEAD_KIND_LABEL: Record<CrmLeadEntityType, string> = {
  VENUE_LEAD: 'venue',
  HOST_LEAD: 'host',
  ECOMM_LEAD: 'ecommerce seller',
  CREATOR_LEAD: 'creator',
  COMMUNITY_LEAD: 'community',
};

/** Stored bookkeeping the model has no use for (ids, media, the log rendered elsewhere). */
const PROFILE_SKIP = new Set([
  '_id',
  '__v',
  'activity_log',
  'dynamic_values',
  'profile_photo_url',
  'matched_user',
  'matched_user_id',
]);

const isEmpty = (v: unknown) =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/** The lead's own record, minus ids and empty fields, as indented JSON. */
export function profileOf(lead: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(lead)) {
    if (PROFILE_SKIP.has(key) || key.endsWith('_id') || key.endsWith('_ids') || isEmpty(value)) continue;
    out[key] = value instanceof Date ? value.toISOString() : value;
  }
  const dynamic = lead.dynamic_values;
  if (dynamic && typeof dynamic === 'object' && Object.keys(dynamic).length > 0) out.custom_fields = dynamic;
  return out;
}

const clip = (text: string, max = ENTRY_CAP) => (text.length > max ? `${text.slice(0, max)}…` : text);

/** Lines joined until the budget runs out; reports whether anything was cut. */
function fit(lines: string[], budget: number): { body: string; truncated: boolean } {
  const kept: string[] = [];
  let used = 0;
  for (const line of lines) {
    if (used + line.length > budget) {
      const room = budget - used;
      if (room > 40) kept.push(`${line.slice(0, room)}…`);
      return { body: kept.join('\n'), truncated: true };
    }
    kept.push(line);
    used += line.length + 1;
  }
  return { body: kept.join('\n'), truncated: false };
}

interface Section {
  key: (typeof LEAD_AI_SOURCE_KEYS)[number];
  title: string;
  lines: string[];
  empty: string;
}

function render(section: Section): { text: string; source: LeadAiSource } {
  const { body, truncated } = fit(section.lines, BUDGET[section.key]);
  const text = `${section.title}:\n${body || section.empty}`;
  return {
    text,
    source: {
      key: section.key,
      items: section.lines.length,
      chars: body.length,
      tokens: estimateTokens(body),
      truncated,
    },
  };
}

const when = (d: unknown) => appDateTime(d as Date) || 'unknown date';

/** One entry of a lead's embedded activity_log, as stored. */
interface ActivityRow {
  type: string;
  summary?: string | null;
  status?: string | null;
  target?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  created_at?: Date | null;
}

/** The lead document fields this file reads; everything else goes to the profile as-is. */
interface LeadRow extends Record<string, unknown> {
  activity_log?: ActivityRow[];
  contacts?: { email?: string | null }[];
  next_follow_up_date?: Date | null;
}

function noteLines(activity: ActivityRow[]): { notes: string[]; activity: string[] } {
  const newestFirst = [...activity].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
  const notes = newestFirst
    .filter((a) => a.type === 'NOTE')
    .slice(0, ROW_LIMIT.notes)
    .map((a) => {
      const body = clip((a.body_text || htmlToText(a.body_html ?? '')).replace(/\s+/g, ' ').trim());
      const summary = a.summary ? `${a.summary} — ` : '';
      return `- ${when(a.created_at)} · ${summary}${body}`;
    });
  const log = newestFirst
    .filter((a) => a.type !== 'NOTE')
    .slice(0, ROW_LIMIT.activity)
    .map((a) => {
      const status = a.status ? ` [${a.status}]` : '';
      const target = a.target ? ` to ${a.target}` : '';
      const summary = a.summary ? ` — ${a.summary}` : '';
      return `- ${when(a.created_at)} · ${a.type}${status}${target}${summary}`;
    });
  return { notes, activity: log };
}

async function commsLines(entity: CrmLeadEntityType, leadId: Types.ObjectId) {
  const select = 'type status contact_value subject body transcript duration_seconds created_at';
  const [emails, calls] = await Promise.all([
    CommunicationLogModel.find({ entity_type: entity, entity_id: leadId, type: 'EMAIL' })
      .select(select).sort({ created_at: -1 }).limit(ROW_LIMIT.emails).lean(),
    CommunicationLogModel.find({ entity_type: entity, entity_id: leadId, type: 'CALL' })
      .select(select).sort({ created_at: -1 }).limit(ROW_LIMIT.calls).lean(),
  ]);
  return {
    emails: emails.map((e) => {
      const body = clip(htmlToText(e.body ?? '').replace(/\s+/g, ' ').trim());
      return `- ${when(e.created_at)} [${e.status}] to ${e.contact_value} — Subject: ${e.subject || '(none)'}\n  ${body}`;
    }),
    calls: calls.map((c) => {
      const transcript = c.transcript ? `\n  Transcript: ${clip(c.transcript.replace(/\s+/g, ' ').trim())}` : '';
      return `- ${when(c.created_at)} [${c.status}] ${Number(c.duration_seconds ?? 0)}s with ${c.contact_value}${transcript}`;
    }),
  };
}

async function reminderLines(entity: CrmLeadEntityType, leadId: Types.ObjectId, followUp: unknown) {
  const rows = await ReminderModel.find({ entity_type: entity, lead_id: leadId })
    .select('title due_at status notes').sort({ due_at: 1 }).limit(ROW_LIMIT.reminders).lean();
  const refs: LeadAiReminderRef[] = rows.map((r) => ({ id: String(r._id), title: r.title, status: r.status }));
  const lines = rows.map((r) => {
    const notes = r.notes ? ` (${clip(r.notes, 300)})` : '';
    return `- id=${String(r._id)} [${r.status}] due ${when(r.due_at)} — ${r.title}${notes}`;
  });
  if (followUp) lines.unshift(`- Next follow-up date on the lead: ${when(followUp)}`);
  return { lines, refs };
}

async function websiteLines(entity: CrmLeadEntityType, leadId: Types.ObjectId) {
  const pages = await WebsitePageModel.find({ entity_type: entity, lead_id: leadId, status: 'FETCHED' })
    .select('url title content_text').limit(ROW_LIMIT.website).lean();
  return pages.map((p) => `# ${p.title || p.url}\n${p.url}\n${clip(String(p.content_text ?? ''), 3000)}`);
}

const primaryEmail = (lead: LeadRow): string =>
  (lead.contacts ?? []).map((c) => String(c?.email ?? '').trim()).find(Boolean) ?? '';

/** Read every source for one lead and render the model's context. */
export async function buildLeadAiContext(entity: CrmLeadEntityType, leadId: string): Promise<LeadAiContext> {
  if (!Types.ObjectId.isValid(leadId)) {
    throw new GraphQLError('Lead not found', { extensions: { code: 'NOT_FOUND' } });
  }
  const id = new Types.ObjectId(leadId);
  const Model = LEAD_MODELS[entity] as unknown as { findById: (id: unknown) => { lean: () => Promise<LeadRow | null> } };
  const lead = await Model.findById(id).lean();
  if (!lead) throw new GraphQLError('Lead not found', { extensions: { code: 'NOT_FOUND' } });

  const { notes, activity } = noteLines(lead.activity_log ?? []);
  const [comms, reminders, website] = await Promise.all([
    commsLines(entity, id),
    reminderLines(entity, id, lead.next_follow_up_date),
    websiteLines(entity, id),
  ]);

  const kind = LEAD_KIND_LABEL[entity];
  const sections: Section[] = [
    {
      key: 'profile',
      title: `LEAD PROFILE (${kind} lead)`,
      lines: JSON.stringify(profileOf(lead), null, 2).split('\n'),
      empty: '(No profile data.)',
    },
    { key: 'notes', title: 'NOTES (manual logs, newest first)', lines: notes, empty: '(No notes.)' },
    { key: 'activity', title: 'ACTIVITY LOG (newest first)', lines: activity, empty: '(No activity.)' },
    { key: 'emails', title: 'EMAILS SENT (newest first)', lines: comms.emails, empty: '(No emails.)' },
    { key: 'calls', title: 'CALLS (newest first)', lines: comms.calls, empty: '(No calls.)' },
    { key: 'reminders', title: 'REMINDERS AND FOLLOW-UPS', lines: reminders.lines, empty: '(No reminders.)' },
    { key: 'website', title: 'WEBSITE CONTENT', lines: website, empty: '(No website content fetched.)' },
  ];
  const rendered = sections.map(render);
  // The profile's line count is JSON layout, not a number of records.
  rendered[0].source.items = 1;

  return {
    text: rendered.map((r) => r.text).join('\n\n'),
    sources: rendered.map((r) => r.source),
    lead: { display_name: String(lead[NAME_FIELD[entity]] ?? ''), primary_email: primaryEmail(lead) },
    reminders: reminders.refs,
  };
}
