import { GraphQLError } from 'graphql';
import { Error as MongooseError, Types } from 'mongoose';
import type { CrmLeadEntityType } from '@modules/crm/crm/crm.constants';
import { LEAD_LABELS, LEAD_MODELS } from '@modules/crm/crm/leadModels';
import { activeStaffByIds } from '@modules/crm/crmUser/crmUser.service';
import { LEGACY_PREFIX, NOTE_AUDIT_TYPES, canChangeLog, mentionIdsIn, toActivity, type StoredActivity } from './manualLog.view';
import { notifyMentionedUsers } from './manualLog.notify';

/**
 * Manual logs ("Manual Logs" tab on every lead page): notes the CRM team keeps
 * on a lead, stored as NOTE entries in the lead's activity_log.
 *
 * - Every create / edit / delete also appends its own audit entry
 *   (NOTE_CREATED / NOTE_UPDATED / NOTE_DELETED), so the history stays readable.
 * - Delete never removes the NOTE: it is stamped deleted and the API stops
 *   serving its words — the portal shows "This log was deleted" in its place.
 * - Only the author (or a SUPER_ADMIN) may edit or delete a log.
 * - @mentions are read from the HTML; each newly mentioned CRM team member is
 *   emailed once. A failed email never fails the save.
 */

export interface LogActor {
  id: string;
  roles: readonly string[];
}

interface LogTarget {
  entity_type: CrmLeadEntityType;
  entity_id: string;
}

export interface CreateLogInput extends LogTarget {
  summary?: string | null;
  body_html: string;
  body_text?: string | null;
}

export interface UpdateLogInput extends CreateLogInput {
  log_id: string;
}

export interface DeleteLogInput extends LogTarget {
  log_id: string;
}

interface LeadDoc {
  _id: unknown;
  activity_log: StoredActivity[];
  markModified(path: string): void;
  save(): Promise<unknown>;
}

/** The lead docs are typed per model; manual logs only touch what every lead shares. */
interface LeadFinder {
  findById(id: string): PromiseLike<LeadDoc | null>;
}

const MAX_SUMMARY = 200;
const MAX_BODY = 100_000;
const SAVE_ATTEMPTS = 3;

const badInput = (message: string, field?: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', ...(field ? { field } : {}) } });

function cleanContent(input: CreateLogInput) {
  const body_html = (input.body_html ?? '').trim();
  if (!body_html) throw badInput('Write something in the log before saving.', 'body_html');
  if (body_html.length > MAX_BODY) throw badInput('This log is too long. Split it into two logs.', 'body_html');
  return {
    summary: (input.summary ?? '').trim().slice(0, MAX_SUMMARY),
    body_html,
    body_text: (input.body_text ?? '').trim().slice(0, MAX_BODY),
  };
}

async function loadLead(target: LogTarget): Promise<LeadDoc> {
  const label = LEAD_LABELS[target.entity_type];
  if (!label || !Types.ObjectId.isValid(target.entity_id)) throw badInput('Unknown lead.');
  const Model = LEAD_MODELS[target.entity_type] as unknown as LeadFinder;
  const lead = await Model.findById(target.entity_id);
  if (!lead) throw new GraphQLError(`${label} not found`, { extensions: { code: 'NOT_FOUND' } });
  return lead;
}

/** The NOTE a log id points at, and its position. */
function findNote(lead: LeadDoc, logId: string): { note: StoredActivity; index: number } {
  const log = lead.activity_log;
  let index = -1;
  if (logId.startsWith(LEGACY_PREFIX)) {
    const position = Number(logId.slice(LEGACY_PREFIX.length));
    if (Number.isInteger(position) && log[position] && !log[position].log_id) index = position;
  } else {
    index = log.findIndex((entry) => entry.log_id === logId);
  }
  const note = log[index];
  if (!note || note.type !== 'NOTE') {
    throw new GraphQLError('That log no longer exists. Refresh the page.', { extensions: { code: 'NOT_FOUND' } });
  }
  return { note, index };
}

function assertCanChange(note: StoredActivity, actor: LogActor) {
  if (note.deleted_at) throw badInput('This log was deleted, so it can no longer be changed.');
  if (!canChangeLog(note, actor)) {
    throw new GraphQLError('Only the person who wrote this log can change it.', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

/** The mentioned ids that are active CRM staff — anything else in the HTML is ignored. */
async function staffMentions(html: string): Promise<string[]> {
  const ids = mentionIdsIn(html);
  if (ids.length === 0) return [];
  const staff = await activeStaffByIds(ids);
  return ids.filter((id) => staff.has(id));
}

/** A plain copy of a log entry (a Mongoose subdocument's own fields live behind toObject). */
const snapshot = (entry: StoredActivity & { toObject?: () => StoredActivity }): StoredActivity =>
  entry.toObject ? entry.toObject() : { ...entry };

const audit = (type: string, logId: string, by: string) => ({
  type,
  target: logId,
  summary: '',
  status: '',
  body_html: '',
  body_text: '',
  created_by: by || null,
  created_at: new Date(),
});

/**
 * Run a change against a freshly loaded lead and save it. An edit rewrites the
 * whole activity_log (an element change plus an appended audit entry cannot
 * share one positional update), which Mongoose guards with the version key: a
 * concurrent write makes this attempt fail, and it is retried on fresh data.
 */
async function changeLead<T>(target: LogTarget, change: (lead: LeadDoc) => T): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    const lead = await loadLead(target);
    const result = change(lead);
    try {
      await lead.save();
      return result;
    } catch (error) {
      if (!(error instanceof MongooseError.VersionError) || attempt >= SAVE_ATTEMPTS) throw error;
    }
  }
}

export const manualLogService = {
  async create(input: CreateLogInput, actor: LogActor) {
    const content = cleanContent(input);
    const mentions = await staffMentions(content.body_html);
    const logId = new Types.ObjectId().toHexString();
    const note: StoredActivity = {
      type: 'NOTE',
      log_id: logId,
      status: '',
      target: '',
      ...content,
      mention_user_ids: mentions,
      created_by: actor.id || null,
      created_at: new Date(),
    };
    await changeLead(input, (lead) => {
      lead.activity_log.push(note, audit(NOTE_AUDIT_TYPES.CREATED, logId, actor.id));
    });
    await notifyMentionedUsers({ ...input, log_id: logId, summary: content.summary, body_text: content.body_text, mentioned: mentions, by: actor.id });
    return toActivity(note);
  },

  async update(input: UpdateLogInput, actor: LogActor) {
    const content = cleanContent(input);
    const mentions = await staffMentions(content.body_html);
    const { saved, previous } = await changeLead(input, (lead) => {
      const { note } = findNote(lead, input.log_id);
      assertCanChange(note, actor);
      const before = note.mention_user_ids ?? [];
      const logId = note.log_id ?? new Types.ObjectId().toHexString();
      Object.assign(note, { ...content, log_id: logId, mention_user_ids: mentions, updated_by: actor.id, updated_at: new Date() });
      lead.activity_log.push(audit(NOTE_AUDIT_TYPES.UPDATED, logId, actor.id));
      lead.markModified('activity_log');
      return { saved: snapshot(note), previous: before };
    });
    // Only people the edit ADDS are told — re-saving a log never re-sends an email.
    const added = mentions.filter((id) => !previous.includes(id));
    await notifyMentionedUsers({ ...input, log_id: saved.log_id ?? input.log_id, summary: content.summary, body_text: content.body_text, mentioned: added, by: actor.id });
    return toActivity(saved);
  },

  async remove(input: DeleteLogInput, actor: LogActor) {
    const saved = await changeLead(input, (lead) => {
      const { note } = findNote(lead, input.log_id);
      assertCanChange(note, actor);
      const logId = note.log_id ?? new Types.ObjectId().toHexString();
      Object.assign(note, { log_id: logId, deleted_by: actor.id, deleted_at: new Date() });
      lead.activity_log.push(audit(NOTE_AUDIT_TYPES.DELETED, logId, actor.id));
      lead.markModified('activity_log');
      return snapshot(note);
    });
    return toActivity(saved);
  },
};
