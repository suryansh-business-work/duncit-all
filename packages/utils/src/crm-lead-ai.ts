/**
 * A CRM lead's Ask AI conversation: the starter questions, what each context
 * source is called, each proposal's heading, and the reminder change a
 * proposal carries. Shared by the CRM portal's drawer and the Duncit CRM app's
 * tab, so both read and carry out a proposal the same way.
 */

/** The questions offered while the conversation is empty. */
export const CRM_LEAD_AI_SUGGESTIONS = ['crm.askAi.suggestSummary', 'crm.askAi.suggestEmail', 'crm.askAi.suggestReminder'] as const;

/** One literal key per source the server reports (the translation gate needs literals). */
export const CRM_LEAD_AI_SOURCE_LABEL: Readonly<Record<string, string>> = {
  profile: 'crm.askAi.source.profile',
  notes: 'crm.askAi.source.notes',
  activity: 'crm.askAi.source.activity',
  emails: 'crm.askAi.source.emails',
  calls: 'crm.askAi.source.calls',
  reminders: 'crm.askAi.source.reminders',
  website: 'crm.askAi.source.website',
  conversation: 'crm.askAi.source.conversation',
};

export type CrmLeadAiActionType = 'EMAIL_DRAFT' | 'CREATE_REMINDER' | 'UPDATE_REMINDER';

export const CRM_LEAD_AI_ACTION_HEADING: Readonly<Record<CrmLeadAiActionType, string>> = {
  EMAIL_DRAFT: 'crm.askAi.emailDraft',
  CREATE_REMINDER: 'crm.askAi.newReminder',
  UPDATE_REMINDER: 'crm.askAi.reminderChange',
};

/** The context's size line: kilobytes to one decimal. */
export const crmLeadAiKb = (chars: number): string => (chars / 1024).toFixed(1);

export interface CrmLeadAiReminderProposal<S extends string = string> {
  title?: string | null;
  due_at?: string | null;
  notes?: string | null;
  reminder_status?: S | null;
}

export interface CrmLeadAiReminderChange<S extends string = string> {
  title?: string;
  due_at?: string;
  notes?: string;
  status?: S;
}

/** Only the fields the assistant proposed to change, as updateCrmReminder takes them. */
export function crmLeadAiReminderUpdate<S extends string>(action: CrmLeadAiReminderProposal<S>): CrmLeadAiReminderChange<S> {
  const input: CrmLeadAiReminderChange<S> = {};
  if (action.title) input.title = action.title;
  if (action.due_at) input.due_at = action.due_at;
  if (action.notes) input.notes = action.notes;
  if (action.reminder_status) input.status = action.reminder_status;
  return input;
}

/** A short one-line preview of a longer text (an email draft's body). */
export function crmTextPreview(text: string, max = 180): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
}
