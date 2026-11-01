/**
 * Outreach › Sequences: a fixed list of steps a marketing lead is walked
 * through — an email, a WhatsApp message on an approved Communications
 * template, a DM a person sends by hand, and the waits between them — until
 * the lead replies, opts out or the steps run out.
 */
export const STEP_KINDS = ['EMAIL', 'WHATSAPP', 'DM_TASK', 'WAIT'] as const;
export type OutreachStepKind = (typeof STEP_KINDS)[number];

export const ENROLLMENT_STATUSES = ['ACTIVE', 'REPLIED', 'OPTED_OUT', 'DONE', 'FAILED', 'PAUSED'] as const;
export type OutreachEnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/** An enrollment in one of these is over; the scheduler never looks at it again. */
export const FINISHED_STATUSES: readonly OutreachEnrollmentStatus[] = ['REPLIED', 'OPTED_OUT', 'DONE'];

export const HISTORY_KINDS = [
  'ENROLLED',
  'SENT',
  'SKIPPED',
  'FAILED',
  'TASK',
  'TASK_DONE',
  'REPLIED',
  'OPTED_OUT',
  'PAUSED',
  'RESUMED',
  'DONE',
] as const;
export type OutreachHistoryKind = (typeof HISTORY_KINDS)[number];

export const TASK_STATUSES = ['OPEN', 'DONE', 'CANCELLED'] as const;
export type OutreachTaskStatus = (typeof TASK_STATUSES)[number];

/** What one claimed send became. CLAIMED is the row's state while the send is in flight. */
export const SEND_STATUSES = ['CLAIMED', 'SENT', 'SKIPPED', 'FAILED'] as const;
export type OutreachSendStatus = (typeof SEND_STATUSES)[number];

/** The bounds the API holds a sequence to. The portal's form mirrors them. */
export const OUTREACH_LIMITS = {
  name: { min: 1, max: 80 },
  description: { max: 300 },
  steps: { min: 1, max: 20 },
  subject: { max: 150 },
  body: { max: 4000 },
  wa_params: { max: 10, each: 200 },
  wait_days: { min: 1, max: 60 },
  daily_limit: { min: 1, max: 500 },
  hour: { min: 0, max: 23 },
  enroll: { max: 1000 },
  note: { max: 500 },
} as const;

/** Read: the marketing console. Activate, enroll and manage enrollments: a manager. */
export const OUTREACH_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR'];
export const OUTREACH_MANAGE = ['SUPER_ADMIN', 'MARKETING_MANAGER'];

/** The variables a subject, body or WhatsApp value may use. */
export const OUTREACH_VARIABLES = ['name', 'company'] as const;

export interface OutreachStepInput {
  kind: OutreachStepKind;
  wait_days?: number | null;
  subject?: string | null;
  body?: string | null;
  wa_template_key?: string | null;
  wa_params?: readonly string[] | null;
}

export interface OutreachSequenceInput {
  name: string;
  description?: string | null;
  pipeline?: string | null;
  steps: readonly OutreachStepInput[];
  daily_limit: number;
  quiet_start_hour?: number | null;
  quiet_end_hour?: number | null;
  stop_on_reply?: boolean | null;
}

/** Which leads an enroll by filter takes. Every field narrows; none given is every open lead the sequence fits. */
export interface OutreachLeadFilter {
  pipeline?: string | null;
  stage?: string | null;
  city?: string | null;
}
