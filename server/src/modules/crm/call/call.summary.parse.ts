import { CALL_SENTIMENTS, type CallSentiment } from '@modules/crm/communicationLog/communicationLog.model';

export interface ParsedFollowUp {
  title: string;
  due_at: Date;
  notes: string;
}

export interface ParsedCallSummary {
  text: string;
  key_points: string[];
  sentiment: CallSentiment | null;
  outcome: string;
  follow_ups: string[];
  /** A dated follow-up the model proposed, only when the date is a real one ahead of now. */
  reminder: ParsedFollowUp | null;
}

const MAX_POINTS = 8;
const MAX_TEXT = 2000;
const MAX_ITEM = 300;
/** A follow-up further out than this is a misread date, not a plan. */
const MAX_FOLLOW_UP_MS = 366 * 24 * 60 * 60 * 1000;

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const list = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => text(item, MAX_ITEM))
        .filter(Boolean)
        .slice(0, MAX_POINTS)
    : [];

const sentimentOf = (value: unknown): CallSentiment | null => {
  const upper = text(value, 20).toUpperCase();
  return (CALL_SENTIMENTS as readonly string[]).includes(upper) ? (upper as CallSentiment) : null;
};

function reminderOf(value: unknown, now: Date): ParsedFollowUp | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const title = text(raw.title, 200);
  const due = new Date(text(raw.due_at, 40));
  if (!title || Number.isNaN(due.getTime())) return null;
  const ahead = due.getTime() - now.getTime();
  if (ahead <= 0 || ahead > MAX_FOLLOW_UP_MS) return null;
  return { title, due_at: due, notes: text(raw.notes, MAX_TEXT) };
}

/**
 * Read the model's JSON answer into a summary we are willing to store: every
 * field is trimmed and capped, an unknown sentiment becomes null, and a
 * follow-up date in the past or absurdly far ahead is dropped rather than
 * turned into a reminder. Returns null when the answer has no summary at all.
 */
export function parseCallSummary(content: string, now: Date = new Date()): ParsedCallSummary | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content || '{}');
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const raw = parsed as Record<string, unknown>;
  const summary = text(raw.summary, MAX_TEXT);
  if (!summary) return null;
  return {
    text: summary,
    key_points: list(raw.key_points),
    sentiment: sentimentOf(raw.sentiment),
    outcome: text(raw.outcome, MAX_ITEM),
    follow_ups: list(raw.follow_ups),
    reminder: reminderOf(raw.follow_up_reminder, now),
  };
}
