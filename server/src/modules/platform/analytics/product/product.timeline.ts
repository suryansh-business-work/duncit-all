import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { escapedSearchRegex } from '@utils/table-query';
import { AppEventModel } from '../appEvent.model';
import { memberOutcomes, PRODUCT_OUTCOMES, type OutcomeOccurrence } from './product.outcomes';
import { memberEventMatch, memberId } from './product.users';
import { toProductEvent } from './product.events';

/**
 * One member's activity in time order, newest first: what the app recorded on
 * the device (CLIENT) beside what the server holds as done (SERVER — signed
 * up, joined a pod, paid, refunded). Read a page at a time, older pages by
 * passing the last entry's time as `before`.
 */

export interface TimelineArgs {
  user_id: string;
  before?: string | null;
  from?: string | null;
  event_names?: readonly string[] | null;
  limit?: number | null;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;
const DAY_MS = 24 * 60 * 60 * 1000;
/** The names outcomes carry on the timeline: payment_succeeded, pod_joined, … */
const OUTCOME_NAMES = new Set(PRODUCT_OUTCOMES.map((outcome) => outcome.toLowerCase()));

const toDate = (text: string | null | undefined, fallback: Date) => {
  const at = text ? new Date(text) : fallback;
  return Number.isNaN(at.getTime()) ? fallback : at;
};

const outcomeEntry = (row: OutcomeOccurrence) => ({
  id: `${row.outcome}:${row.ref}`,
  at: row.at.toISOString(),
  source: 'SERVER',
  event_name: row.outcome.toLowerCase(),
  screen_name: '',
  label: row.ref,
  session_id: null,
  platform: '',
  properties_json: '{}',
});

export async function productUserTimeline(args: TimelineArgs) {
  const id = memberId(args.user_id);
  const before = toDate(args.before, new Date());
  const from = toDate(args.from, new Date(0));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.round(args.limit ?? DEFAULT_LIMIT)));
  const names = args.event_names?.filter(Boolean) ?? [];
  const clientNames = names.filter((name) => !OUTCOME_NAMES.has(name));
  const wantsClient = names.length === 0 || clientNames.length > 0;
  const match = await memberEventMatch(id);
  const events = wantsClient
    ? await AppEventModel.find({
        ...match,
        occurred_at: { $gte: from, $lt: before },
        ...(clientNames.length ? { event_name: { $in: clientNames } } : {}),
      })
        .sort({ occurred_at: -1 })
        .limit(limit)
        .lean()
    : [];
  // Outcomes are few; read them back to the oldest event on this page (or a month, when there are none).
  const oldest = events.length === limit ? events[events.length - 1].occurred_at : new Date(Math.max(from.getTime(), before.getTime() - 30 * DAY_MS));
  const outcomes = (await memberOutcomes(id, { from: oldest, to: before })).filter(
    (row) => names.length === 0 || names.includes(row.outcome.toLowerCase())
  );
  const client = events.map((doc) => {
    const event = toProductEvent(doc);
    return {
      id: event.id,
      at: event.occurred_at,
      source: 'CLIENT',
      event_name: event.event_name,
      screen_name: event.screen_name,
      label: event.element_name || event.element_id || event.element_text,
      session_id: event.session_id || null,
      platform: event.platform,
      properties_json: event.properties_json,
    };
  });
  return [...client, ...outcomes.map(outcomeEntry)]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

const maskPhone = (number?: string) => (number && number.length >= 4 ? `••••${number.slice(-4)}` : null);
const maskEmail = (email?: string) => {
  if (!email?.includes('@')) return null;
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}•••@${domain}`;
};

/** Members by name, username, email or phone — at most ten, contacts masked. */
export async function productUserSearch(search: string) {
  const text = search.trim();
  if (text.length < 2) return [];
  const rx = escapedSearchRegex(text);
  const or: Record<string, unknown>[] = [
    { 'profile.first_name': rx },
    { 'profile.last_name': rx },
    { 'profile.username': rx },
    { 'auth.email': rx },
    { 'auth.phone.number': rx },
  ];
  if (Types.ObjectId.isValid(text)) or.push({ _id: new Types.ObjectId(text) });
  const rows = await UserModel.find({ $or: or, 'metadata.deleted_at': null })
    .select('profile.first_name profile.last_name auth.email auth.phone.number')
    .limit(10)
    .lean<
      Array<{
        _id: Types.ObjectId;
        profile?: { first_name?: string; last_name?: string };
        auth?: { email?: string; phone?: { number?: string } };
      }>
    >();
  return rows.map((row) => ({
    user_id: String(row._id),
    name: [row.profile?.first_name, row.profile?.last_name].filter(Boolean).join(' '),
    contact: maskPhone(row.auth?.phone?.number) ?? maskEmail(row.auth?.email),
  }));
}
