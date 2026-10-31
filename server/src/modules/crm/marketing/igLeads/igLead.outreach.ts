import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { fromZonedTime } from 'date-fns-tz';
import { appFormat, getAppTimeZone } from '@utils/app-time';
import { askForJson, text } from '../social/social.llm';
import { IgLeadModel, IgLeadSettingsModel } from './igLead.model';
import { CLOSED_STATUSES, SETTINGS_LIMITS, type IgLeadStatus } from './igLead.types';

/**
 * Working a lead: the AI drafts the next message, the marketer sends it from
 * Instagram and marks it sent here, and the next follow-up falls due after the
 * configured gap — until the lead replies, or the follow-ups run out.
 */
const DAY_MS = 86_400_000;
const MESSAGE_MAX = 1000;

export interface IgLeadSettingsInput {
  max_follow_ups: number;
  follow_up_gap_days: number;
  daily_send_limit: number;
  pitch: string;
}

function refuse(message: string, code: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

function leadId(id: string): string {
  if (!isValidObjectId(id)) refuse('Lead not found', 'NOT_FOUND');
  return id;
}

export async function loadSettings() {
  const doc = await IgLeadSettingsModel.findOneAndUpdate({ key: 'default' }, { $setOnInsert: { key: 'default' } }, { upsert: true, new: true }).lean();
  return doc;
}

function inBounds(value: number, { min, max }: { min: number; max: number }, label: string): number {
  if (!Number.isInteger(value) || value < min || value > max) refuse(`${label} must be a whole number from ${min} to ${max}.`, 'BAD_USER_INPUT');
  return value;
}

export async function saveSettings(input: IgLeadSettingsInput, userId: string) {
  const pitch = (input.pitch ?? '').trim();
  if (pitch.length > SETTINGS_LIMITS.pitch.max) refuse(`Keep the offer under ${SETTINGS_LIMITS.pitch.max} characters.`, 'BAD_USER_INPUT');
  return IgLeadSettingsModel.findOneAndUpdate(
    { key: 'default' },
    {
      max_follow_ups: inBounds(input.max_follow_ups, SETTINGS_LIMITS.max_follow_ups, 'Follow-ups'),
      follow_up_gap_days: inBounds(input.follow_up_gap_days, SETTINGS_LIMITS.follow_up_gap_days, 'Days between follow-ups'),
      daily_send_limit: inBounds(input.daily_send_limit, SETTINGS_LIMITS.daily_send_limit, 'Daily limit'),
      pitch,
      updated_by: userId,
    },
    { upsert: true, new: true }
  ).lean();
}

/** Midnight today in the admin's zone — the daily limit resets then, not at UTC midnight. */
function startOfAppDay(now = new Date()): Date {
  return fromZonedTime(`${appFormat(now, 'yyyy-MM-dd')}T00:00:00`, getAppTimeZone());
}

/** DMs marked sent since midnight, across every lead. */
export async function sentToday(): Promise<number> {
  const [row] = await IgLeadModel.aggregate<{ count: number }>([
    { $match: { 'messages.sent_at': { $gte: startOfAppDay() } } },
    { $unwind: '$messages' },
    { $match: { 'messages.sent_at': { $gte: startOfAppDay() } } },
    { $count: 'count' },
  ]);
  return row?.count ?? 0;
}

const stepLabel = (step: number, maxFollowUps: number) => (step === 0 ? 'Opening message' : `Follow-up ${step} of ${maxFollowUps}`);

/** The AI's draft of the lead's next message, kept on the lead until it is sent. */
export async function draftMessage(id: string) {
  const [lead, settings] = await Promise.all([IgLeadModel.findById(leadId(id)).lean(), loadSettings()]);
  if (!lead) refuse('Lead not found', 'NOT_FOUND');
  if (CLOSED_STATUSES.includes(lead.status as IgLeadStatus)) refuse('This conversation is closed — reopen the lead to message it again.', 'BAD_USER_INPUT');
  const step = lead.messages.length;
  if (step > settings.max_follow_ups) refuse('Every follow-up in Settings has been sent to this lead.', 'BAD_USER_INPUT');
  if (!settings.pitch) refuse('Write what Duncit is offering in Instagram Leads settings first — every DM is built around it.', 'BAD_USER_INPUT');
  const answer = await askForJson({
    task: 'marketing.ig_lead_message',
    systemKey: 'ig_leads.message',
    userKey: 'ig_leads.message.user',
    variables: {
      pitch: settings.pitch,
      profile: `@${lead.username} · ${lead.name || '-'} · ${lead.followers ?? '?'} followers\n${lead.bio}`,
      step: stepLabel(step, settings.max_follow_ups),
      history: lead.messages.length ? lead.messages.map((m) => `${stepLabel(m.step, settings.max_follow_ups)}: ${m.text}`).join('\n') : 'none',
    },
    detail: `lead @${lead.username}`,
    maxTokens: 500,
  });
  const draft = text(answer.text).slice(0, MESSAGE_MAX);
  if (!draft) refuse('The AI answered in a form that could not be read — try again.', 'AI_UNREADABLE');
  const updated = await IgLeadModel.findByIdAndUpdate(lead._id, { draft, draft_step: step }, { new: true }).lean();
  if (!updated) refuse('Lead not found', 'NOT_FOUND');
  return updated;
}

/**
 * Record the DM the marketer is sending now. Checked against the daily limit
 * first, and written only if no other send for the same step got there first,
 * so a double click cannot count one message twice.
 */
export async function markSent(id: string, message: string, userId: string) {
  const body = (message ?? '').trim();
  if (!body || body.length > MESSAGE_MAX) refuse(`The message must be 1-${MESSAGE_MAX} characters.`, 'BAD_USER_INPUT');
  const [lead, settings, today] = await Promise.all([IgLeadModel.findById(leadId(id)).lean(), loadSettings(), sentToday()]);
  if (!lead) refuse('Lead not found', 'NOT_FOUND');
  if (CLOSED_STATUSES.includes(lead.status as IgLeadStatus)) refuse('This conversation is closed.', 'BAD_USER_INPUT');
  if (today >= settings.daily_send_limit) {
    refuse(`Today's limit of ${settings.daily_send_limit} DMs is reached — more in a day is what gets an account restricted.`, 'RATE_LIMITED');
  }
  const step = lead.messages.length;
  if (step > settings.max_follow_ups) refuse('Every follow-up in Settings has been sent to this lead.', 'BAD_USER_INPUT');
  const now = new Date();
  const updated = await IgLeadModel.findOneAndUpdate(
    { _id: lead._id, messages: { $size: step }, status: { $nin: CLOSED_STATUSES } },
    {
      $push: { messages: { step, text: body, sent_at: now, sent_by: userId } },
      $set: {
        status: 'CONTACTED',
        draft: '',
        draft_step: null,
        last_contacted_at: now,
        next_follow_up_at: step < settings.max_follow_ups ? new Date(now.getTime() + settings.follow_up_gap_days * DAY_MS) : null,
      },
    },
    { new: true }
  ).lean();
  if (!updated) refuse('This lead changed while you were sending — reopen it and check.', 'CONFLICT');
  return updated;
}

/** Replied, converted or lost ends the follow-ups; the marketer sets each by hand from the lead. */
export async function setStatus(id: string, status: IgLeadStatus) {
  const closed = CLOSED_STATUSES.includes(status);
  const update: Record<string, unknown> = { status };
  if (closed) update.next_follow_up_at = null;
  if (status === 'REPLIED') update.replied_at = new Date();
  const lead = await IgLeadModel.findByIdAndUpdate(leadId(id), update, { new: true }).lean();
  if (!lead) refuse('Lead not found', 'NOT_FOUND');
  return lead;
}

export async function deleteLead(id: string): Promise<boolean> {
  const removed = await IgLeadModel.findByIdAndDelete(leadId(id));
  if (!removed) refuse('Lead not found', 'NOT_FOUND');
  return true;
}
