import { isEmailAddress } from '@utils/email';
import type { LeadAiReminderRef } from './leadAi.context';
import type { LeadAiActionType } from './leadAi.model';

/** The shape stored on a message and returned to the panel. */
export interface LeadAiAction {
  type: LeadAiActionType;
  status: 'PROPOSED';
  to: string;
  subject: string;
  body_html: string;
  reminder_id: string | null;
  title: string;
  due_at: Date | null;
  notes: string;
  reminder_status: 'PENDING' | 'DONE' | null;
  result_message: string;
}

/** At most this many proposals ride on one answer. */
export const MAX_ACTIONS = 3;

const LIMITS = { subject: 200, body: 20000, title: 200, notes: 1000 } as const;

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const blank = (type: LeadAiActionType): LeadAiAction => ({
  type,
  status: 'PROPOSED',
  to: '',
  subject: '',
  body_html: '',
  reminder_id: null,
  title: '',
  due_at: null,
  notes: '',
  reminder_status: null,
  result_message: '',
});

function dateOf(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function emailDraft(raw: Record<string, unknown>, fallbackTo: string): LeadAiAction | null {
  const subject = text(raw.subject, LIMITS.subject);
  const body = text(raw.body_html, LIMITS.body);
  if (!subject || !body) return null;
  const to = text(raw.to, 320);
  return { ...blank('EMAIL_DRAFT'), to: isEmailAddress(to) ? to : fallbackTo, subject, body_html: body };
}

function createReminder(raw: Record<string, unknown>): LeadAiAction | null {
  const title = text(raw.title, LIMITS.title);
  const due = dateOf(raw.due_at);
  if (!title || !due) return null;
  return { ...blank('CREATE_REMINDER'), title, due_at: due, notes: text(raw.notes, LIMITS.notes) };
}

function updateReminder(raw: Record<string, unknown>, reminders: LeadAiReminderRef[]): LeadAiAction | null {
  const id = text(raw.reminder_id, 64);
  // The model may only touch reminders that belong to this lead.
  if (!reminders.some((r) => r.id === id)) return null;
  const status: LeadAiAction['reminder_status'] = raw.status === 'DONE' || raw.status === 'PENDING' ? raw.status : null;
  const action: LeadAiAction = {
    ...blank('UPDATE_REMINDER'),
    reminder_id: id,
    title: text(raw.title, LIMITS.title),
    due_at: dateOf(raw.due_at),
    notes: text(raw.notes, LIMITS.notes),
    reminder_status: status,
  };
  const changes = action.title || action.due_at || action.notes || action.reminder_status;
  return changes ? action : null;
}

/**
 * Keep only well-formed proposals. The model is untrusted: an unknown type, a
 * reminder that isn't this lead's, an unparseable date or an empty draft is
 * dropped rather than shown as a button that would fail.
 */
export function parseLeadAiActions(
  raw: unknown,
  ctx: { reminders: LeadAiReminderRef[]; fallbackTo: string }
): LeadAiAction[] {
  if (!Array.isArray(raw)) return [];
  const out: LeadAiAction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    let action: LeadAiAction | null = null;
    if (entry.type === 'EMAIL_DRAFT') action = emailDraft(entry, ctx.fallbackTo);
    else if (entry.type === 'CREATE_REMINDER') action = createReminder(entry);
    else if (entry.type === 'UPDATE_REMINDER') action = updateReminder(entry, ctx.reminders);
    if (action) out.push(action);
    if (out.length === MAX_ACTIONS) break;
  }
  return out;
}

/** How a past proposal reads back to the model, so it knows what already happened. */
export function describeAction(a: { type: string; status?: string | null; subject?: string | null; title?: string | null }): string {
  const what = a.type === 'EMAIL_DRAFT' ? `email draft "${a.subject ?? ''}"` : `${a.type.toLowerCase().replaceAll('_', ' ')} "${a.title ?? ''}"`;
  return `[${what}: ${a.status ?? 'PROPOSED'}]`;
}
