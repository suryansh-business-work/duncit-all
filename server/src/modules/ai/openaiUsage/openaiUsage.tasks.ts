/**
 * The catalogue of every OpenAI task the product runs.
 *
 * A task key is what the AI portal groups spend by, so it names the FEATURE
 * ("screen a pod for policy violations"), not the code path. Adding a new
 * OpenAI call means adding its key here first — `openaiChat` refuses an unknown
 * key, which is what stops a new feature from spending money under a blank
 * label nobody can attribute.
 *
 * `module` is the owning area, and is the only grouping the dashboard offers
 * above task level; keep the set small enough to read in one glance.
 */

export interface OpenAiTaskMeta {
  /** What this call does, in the words someone reading a bill would use. */
  label: string;
  /** Owning area — the dashboard's second grouping. */
  module: string;
}

export const OPENAI_TASKS = {
  'ai.dummy_data': { label: 'Dummy data fill', module: 'Admin Tools' },
  'ai.product_copy': { label: 'Product description', module: 'Admin Tools' },
  'ai.location_areas': { label: 'City zones fill', module: 'Admin Tools' },
  'ai.admin_chat': { label: 'Admin assistant chat', module: 'Admin Tools' },
  'ai.email_mjml': { label: 'Email template MJML', module: 'Admin Tools' },
  'moderation.pod': { label: 'Pod moderation scan', module: 'Moderation' },
  'moderation.product': { label: 'Product moderation scan', module: 'Moderation' },
  'moderation.meeting_reason': { label: 'Meeting reason check', module: 'Moderation' },
  'moderation.image_scan': { label: 'Uploaded image scan', module: 'Moderation' },
  'moderation.pod_audit': { label: 'Pod audit review', module: 'Moderation' },
  'support.assistant': { label: 'Support chat reply', module: 'Support' },
  'support.mail_reply': { label: 'Mail auto-reply', module: 'Support' },
  'crm.lead_parse': { label: 'Lead text parsing', module: 'CRM' },
  'crm.lead_chat': { label: 'Lead assistant chat', module: 'CRM' },
  'crm.call_assistant': { label: 'Call assistant turn', module: 'CRM' },
  'platform.release_notes': { label: 'Release changelog', module: 'Platform' },
  'askbot.navigation': { label: 'Navigation bot answer', module: 'Ask Bot' },
} as const satisfies Record<string, OpenAiTaskMeta>;

export type OpenAiTaskKey = keyof typeof OPENAI_TASKS;

export const OPENAI_TASK_KEYS = Object.keys(OPENAI_TASKS) as OpenAiTaskKey[];

/** The catalogue as the filter options the Logs page renders. */
export const openAiTaskOptions = () =>
  OPENAI_TASK_KEYS.map((key) => ({
    key,
    label: OPENAI_TASKS[key].label,
    module: OPENAI_TASKS[key].module,
  }));

export const openAiModules = () =>
  Array.from(new Set(OPENAI_TASK_KEYS.map((key) => OPENAI_TASKS[key].module))).sort((a, b) =>
    a.localeCompare(b),
  );
