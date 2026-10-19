/**
 * The catalogue of every OpenAI task the product runs.
 *
 * A task key is what the AI portal groups spend by, so it names the FEATURE
 * ("screen a pod for policy violations"), not the code path. Adding a new
 * OpenAI call means adding its key here first — `openaiChat` refuses an unknown
 * key, which is what stops a new feature from spending money under a blank
 * label nobody can attribute.
 *
 * It is also the AI Features registry: every key here gets an On/Off switch in
 * the AI portal (`aiFeature` module), checked by `openaiChat` before it calls.
 *
 * `module` is the owning area, and is the only grouping the dashboard offers
 * above task level; keep the set small enough to read in one glance.
 */

export interface OpenAiTaskMeta {
  /** What this call does, in the words someone reading a bill would use. */
  label: string;
  /** Owning area — the dashboard's second grouping. */
  module: string;
  /** Where the feature lives and what it does, for the AI Features console. */
  description: string;
  /**
   * What the product does instead while the feature is switched off in the AI
   * portal. Every call site already handles a refused call (a missing key, an
   * outage); switching a feature off takes that same path, so this sentence
   * describes the fallback that exists, not a new one.
   */
  when_off: string;
}

const ADMIN_ERROR =
  'The action shows an error saying the AI feature is switched off; nothing is generated.';
const MARKETING_ERROR = 'The Marketing portal shows an error saying AI is unavailable.';
const TECH_ERROR = 'The Tech portal shows an error saying the AI feature is switched off.';
const REASON_ACCEPTED = 'Every reason is accepted, exactly as during an AI outage.';

export const OPENAI_TASKS = {
  'ai.dummy_data': {
    label: 'Dummy data fill',
    module: 'Admin Tools',
    description: 'Fills admin forms with realistic sample values ("Fill with AI").',
    when_off: ADMIN_ERROR,
  },
  'ai.product_copy': {
    label: 'Product description',
    module: 'Admin Tools',
    description: 'Writes product descriptions from the product name and details.',
    when_off: ADMIN_ERROR,
  },
  'ai.location_areas': {
    label: 'City zones fill',
    module: 'Admin Tools',
    description: 'Suggests the areas and zones of a city when one is set up.',
    when_off: ADMIN_ERROR,
  },
  'ai.admin_chat': {
    label: 'Admin assistant chat',
    module: 'Admin Tools',
    description: 'The free-form assistant chat inside the admin tools.',
    when_off: ADMIN_ERROR,
  },
  'ai.email_mjml': {
    label: 'Email template MJML',
    module: 'Admin Tools',
    description: 'Drafts email template markup for the Communications portal.',
    when_off: ADMIN_ERROR,
  },
  'ai.rich_text': {
    label: 'Rich text improvement',
    module: 'Portal Tools',
    description: '"Improve with AI" on rich-text editors across the portals.',
    when_off: ADMIN_ERROR,
  },
  'moderation.pod': {
    label: 'Pod moderation scan',
    module: 'Moderation',
    description: "Screens a pod's text and images for policy violations when it is created or edited.",
    when_off:
      'Pods are screened by the rule-based checks only; the AI review is skipped and never blocks the pod.',
  },
  'moderation.product': {
    label: 'Product moderation scan',
    module: 'Moderation',
    description: "Screens a product's name, variants and images for policy violations.",
    when_off:
      'Products are screened by the rule-based checks only; the AI review is skipped and never blocks the product.',
  },
  'moderation.meeting_reason': {
    label: 'Meeting reason check',
    module: 'Moderation',
    description: 'Checks that a meeting cancel/reschedule reason is genuine text.',
    when_off: REASON_ACCEPTED,
  },
  'moderation.callback_reason': {
    label: 'Callback reason check',
    module: 'Moderation',
    description: 'Checks that a support callback request reason is genuine text.',
    when_off: REASON_ACCEPTED,
  },
  'moderation.image_scan': {
    label: 'Uploaded image scan',
    module: 'Moderation',
    description: 'Vision review of uploaded images, listed in AI Monitoring > Logs.',
    when_off: 'Uploads still succeed; each AI Monitoring row is recorded as Skipped with no risk verdict.',
  },
  'moderation.pod_audit': {
    label: 'Pod audit review',
    module: 'Moderation',
    description: 'Summarises and risk-rates each pod change in the pod audit log.',
    when_off: 'Audit rows keep the rule-based risk and summary; no AI summary is added.',
  },
  'moderation.social_comment': {
    label: 'Social comment review',
    module: 'Moderation',
    description: 'Reviews comments on Duncit social accounts in the Marketing portal.',
    when_off: 'Comments are listed without an AI verdict and the review reports why.',
  },
  'support.assistant': {
    label: 'Support chat reply',
    module: 'Support',
    description: 'First reply to members in the in-app support chat.',
    when_off: 'Every support chat is handed straight to a human agent.',
  },
  'support.mail_reply': {
    label: 'Mail auto-reply',
    module: 'Support',
    description: 'Writes the automatic reply to inbound support mail.',
    when_off: 'The rendered email template is sent instead of an AI-written reply.',
  },
  'crm.lead_parse': {
    label: 'Lead text parsing',
    module: 'CRM',
    description: 'Turns pasted lead text into structured CRM lead fields.',
    when_off: 'The CRM shows an error saying the AI feature is switched off; leads are entered by hand.',
  },
  'crm.lead_chat': {
    label: 'Lead assistant chat',
    module: 'CRM',
    description: 'The assistant chat on a CRM lead.',
    when_off: 'The CRM shows an error saying the AI feature is switched off.',
  },
  'crm.call_assistant': {
    label: 'Call assistant turn',
    module: 'CRM',
    description: 'The AI voice agent that talks to a lead on an outbound CRM call.',
    when_off:
      'The call ends politely: the person is told the assistant is unavailable and will be called back.',
  },
  'marketing.social_post_analysis': {
    label: 'Social post analysis',
    module: 'Marketing',
    description: "Analyses one social post's performance in the Marketing portal.",
    when_off: MARKETING_ERROR,
  },
  'marketing.social_insights': {
    label: 'Social performance insights',
    module: 'Marketing',
    description: 'Summarises performance across the social accounts.',
    when_off: MARKETING_ERROR,
  },
  'marketing.social_ideas': {
    label: 'Social post ideas',
    module: 'Marketing',
    description: 'Generates post ideas from a brief and the best recent posts.',
    when_off: MARKETING_ERROR,
  },
  'platform.release_notes': {
    label: 'Release changelog',
    module: 'Platform',
    description: 'Writes the user-facing changelog for an app release.',
    when_off: 'The mechanical changelog built from the commit list is used instead.',
  },
  'platform.stress_verdict': {
    label: 'Stress test verdict',
    module: 'Platform',
    description: 'Explains a stress-test run in the Tech portal.',
    when_off: TECH_ERROR,
  },
  'platform.server_advice': {
    label: 'Server recommendations',
    module: 'Platform',
    description: 'Recommendations from the server info history in the Tech portal.',
    when_off: TECH_ERROR,
  },
  'platform.store_release_advice': {
    label: 'Store rejection advice',
    module: 'Platform',
    description: 'Explains an App Store / Play Store rejection and how to fix it.',
    when_off: 'The release page shows empty advice with the reason it did not run.',
  },
  'platform.analytics_summary': {
    label: 'Analytics report summary',
    module: 'Platform',
    description: 'The written summary at the top of scheduled analytics report mails.',
    when_off: 'Report mails are still sent, without the AI summary.',
  },
  'localization.auto_translate': {
    label: 'Locale auto-translation',
    module: 'Platform',
    description: 'Machine-translates missing localization keys into each language.',
    when_off: 'An auto-translate run stops at its first batch and reports why; nothing is translated.',
  },
  'askbot.navigation': {
    label: 'Navigation bot answer',
    module: 'Ask Bot',
    description: 'The Ask Bot in the portal header that answers "where do I find…".',
    when_off: 'The bot is listed as unavailable and a question returns an error.',
  },
  'agent.console': {
    label: 'Agent console turn',
    module: 'Agent',
    description: 'Plans the action for a staff request typed into the Agent console.',
    when_off: 'The Agent console shows an error saying the AI feature is switched off.',
  },
  'automation.compose': {
    label: 'Automation AI reply',
    module: 'Automation',
    description: 'The "AI reply" step in WhatsApp/Email automation flows.',
    when_off: 'The step is recorded as failed with an empty reply and the flow carries on.',
  },
  'automation.classify': {
    label: 'Automation AI sorting',
    module: 'Automation',
    description: 'The "AI sort" step that routes an inbound message to a flow branch.',
    when_off: 'The step is recorded as failed and the message takes the "Anything else" exit.',
  },
  'reels.director': {
    label: 'Reel Studio edit',
    module: 'Reel Studio',
    description: 'Turns a chat instruction into an edit of a Reel Studio project.',
    when_off: 'The studio chat replies that the AI feature is switched off; the project is not changed.',
  },
} as const satisfies Record<string, OpenAiTaskMeta>;

export type OpenAiTaskKey = keyof typeof OPENAI_TASKS;

export const OPENAI_TASK_KEYS = Object.keys(OPENAI_TASKS) as OpenAiTaskKey[];

/** Narrow a client-supplied key to the catalogue — an unknown key is not a feature. */
export const isOpenAiTaskKey = (key: string): key is OpenAiTaskKey =>
  Object.hasOwn(OPENAI_TASKS, key);

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
