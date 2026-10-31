import type { StatusChipColor } from '@duncit/ui';
import type { OutreachEnrollmentStatus, OutreachHistoryKind, OutreachStepKind } from './queries';

/**
 * Every enum the Outreach page renders, mapped to its Localization key. The
 * keys are written out in full so the translation gate can see each one used.
 */
export const STEP_KINDS: readonly OutreachStepKind[] = ['EMAIL', 'WHATSAPP', 'DM_TASK', 'WAIT'];

export const STEP_KIND_LABEL: Record<OutreachStepKind, string> = {
  EMAIL: 'marketing.outreach.kindEmail',
  WHATSAPP: 'marketing.outreach.kindWhatsapp',
  DM_TASK: 'marketing.outreach.kindDmTask',
  WAIT: 'marketing.outreach.kindWait',
};

export const ENROLLMENT_STATUSES: readonly OutreachEnrollmentStatus[] = ['ACTIVE', 'PAUSED', 'REPLIED', 'OPTED_OUT', 'DONE', 'FAILED'];

export const ENROLLMENT_STATUS_LABEL: Record<OutreachEnrollmentStatus, string> = {
  ACTIVE: 'marketing.outreach.statusActive',
  PAUSED: 'marketing.outreach.statusPaused',
  REPLIED: 'marketing.outreach.statusReplied',
  OPTED_OUT: 'marketing.outreach.statusOptedOut',
  DONE: 'marketing.outreach.statusDone',
  FAILED: 'marketing.outreach.statusFailed',
};

export const ENROLLMENT_STATUS_COLORS: Record<OutreachEnrollmentStatus, StatusChipColor> = {
  ACTIVE: 'info',
  PAUSED: 'warning',
  REPLIED: 'success',
  OPTED_OUT: 'default',
  DONE: 'primary',
  FAILED: 'error',
};

export const HISTORY_LABEL: Record<OutreachHistoryKind, string> = {
  ENROLLED: 'marketing.outreach.historyEnrolled',
  SENT: 'marketing.outreach.historySent',
  SKIPPED: 'marketing.outreach.historySkipped',
  FAILED: 'marketing.outreach.historyFailed',
  TASK: 'marketing.outreach.historyTask',
  TASK_DONE: 'marketing.outreach.historyTaskDone',
  REPLIED: 'marketing.outreach.historyReplied',
  OPTED_OUT: 'marketing.outreach.historyOptedOut',
  PAUSED: 'marketing.outreach.historyPaused',
  RESUMED: 'marketing.outreach.historyResumed',
  DONE: 'marketing.outreach.historyDone',
};

/** The bounds the server holds a sequence to (outreach.types OUTREACH_LIMITS). */
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
  city: { max: 80 },
} as const;

/** The placeholders a subject, body or WhatsApp value may use. */
export const OUTREACH_VARIABLES = ['{name}', '{company}'] as const;

/** Whether a value read off the URL names an enrollment status — anything else is ignored. */
export const isEnrollmentStatus = (value: string | null): value is OutreachEnrollmentStatus =>
  ENROLLMENT_STATUSES.some((status) => status === value);

/** An enrollment a manager can pause, and one they can carry on. */
export const canPauseStatus = (status: OutreachEnrollmentStatus): boolean => status === 'ACTIVE';
export const canResumeStatus = (status: OutreachEnrollmentStatus): boolean => status === 'PAUSED' || status === 'FAILED';
