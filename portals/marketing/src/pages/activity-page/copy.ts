import type { StatusChipColor } from '@duncit/ui';
import type {
  MarketingRunActorKind,
  MarketingRunDecision,
  MarketingRunStatus,
  MarketingRunStepStatus,
  MarketingRunTrigger,
  MarketingRunWorkflow,
} from './queries';

/**
 * Every enum the runs pages render, mapped to its Localization key. The keys
 * are written out in full — never assembled from the enum — so the
 * translation gate can see that each one is used.
 */

export const WORKFLOWS: readonly MarketingRunWorkflow[] = [
  'SOCIAL_PUBLISH',
  'SOCIAL_SYNC',
  'SOCIAL_HEALTH',
  'REEL',
  'LEAD_SEARCH',
  'OUTREACH',
  'AGENT',
  'ORCHESTRATOR',
  'CAMPAIGN',
  'OTHER',
];

export const WORKFLOW_LABEL: Record<MarketingRunWorkflow, string> = {
  SOCIAL_PUBLISH: 'marketing.runs.workflowSocialPublish',
  SOCIAL_SYNC: 'marketing.runs.workflowSocialSync',
  SOCIAL_HEALTH: 'marketing.runs.workflowSocialHealth',
  REEL: 'marketing.runs.workflowReel',
  LEAD_SEARCH: 'marketing.runs.workflowLeadSearch',
  OUTREACH: 'marketing.runs.workflowOutreach',
  AGENT: 'marketing.runs.workflowAgent',
  ORCHESTRATOR: 'marketing.runs.workflowOrchestrator',
  CAMPAIGN: 'marketing.runs.workflowCampaign',
  OTHER: 'marketing.runs.workflowOther',
};

/** In the order a reader meets them: in flight first, then how it ended. */
export const STATUSES: readonly MarketingRunStatus[] = [
  'PENDING',
  'RUNNING',
  'AWAITING_APPROVAL',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED',
];

export const STATUS_LABEL: Record<MarketingRunStatus, string> = {
  PENDING: 'marketing.runs.statusPending',
  RUNNING: 'marketing.runs.statusRunning',
  AWAITING_APPROVAL: 'marketing.runs.statusAwaitingApproval',
  COMPLETED: 'marketing.runs.statusCompleted',
  PARTIAL: 'marketing.runs.statusPartial',
  FAILED: 'marketing.runs.statusFailed',
  CANCELLED: 'marketing.runs.statusCancelled',
};

export const STATUS_COLORS: Record<MarketingRunStatus, StatusChipColor> = {
  PENDING: 'primary',
  RUNNING: 'primary',
  AWAITING_APPROVAL: 'info',
  COMPLETED: 'success',
  PARTIAL: 'warning',
  FAILED: 'error',
  CANCELLED: 'default',
};

/** The statuses a run can still be stopped in — and what My Tasks lists. */
export const OPEN_STATUSES: readonly MarketingRunStatus[] = ['PENDING', 'RUNNING', 'AWAITING_APPROVAL'];

export const TRIGGERS: readonly MarketingRunTrigger[] = ['USER', 'SCHEDULE', 'WEBHOOK', 'AGENT', 'SYSTEM'];

export const TRIGGER_LABEL: Record<MarketingRunTrigger, string> = {
  USER: 'marketing.runs.triggerUser',
  SCHEDULE: 'marketing.runs.triggerSchedule',
  WEBHOOK: 'marketing.runs.triggerWebhook',
  AGENT: 'marketing.runs.triggerAgent',
  SYSTEM: 'marketing.runs.triggerSystem',
};

export const ACTOR_KINDS: readonly MarketingRunActorKind[] = ['USER', 'AGENT', 'SYSTEM'];

export const ACTOR_KIND_LABEL: Record<MarketingRunActorKind, string> = {
  USER: 'marketing.runs.actorUser',
  AGENT: 'marketing.runs.actorAgent',
  SYSTEM: 'marketing.runs.actorSystem',
};

export const STEP_STATUS_LABEL: Record<MarketingRunStepStatus, string> = {
  PENDING: 'marketing.runs.stepPending',
  RUNNING: 'marketing.runs.stepRunning',
  OK: 'marketing.runs.stepOk',
  FAILED: 'marketing.runs.stepFailed',
  SKIPPED: 'marketing.runs.stepSkipped',
  WAITING: 'marketing.runs.stepWaiting',
};

export const STEP_STATUS_COLORS: Record<MarketingRunStepStatus, StatusChipColor> = {
  PENDING: 'default',
  RUNNING: 'primary',
  OK: 'success',
  FAILED: 'error',
  SKIPPED: 'default',
  WAITING: 'info',
};

export const DECISION_LABEL: Record<MarketingRunDecision, string> = {
  APPROVED: 'marketing.runs.decisionApproved',
  REJECTED: 'marketing.runs.decisionRejected',
  CHANGES_REQUESTED: 'marketing.runs.decisionChangesRequested',
};

export const DECISION_COLORS: Record<MarketingRunDecision, StatusChipColor> = {
  APPROVED: 'success',
  REJECTED: 'error',
  CHANGES_REQUESTED: 'warning',
};

/** Whether a value read off the URL names a status — anything else is ignored, not pinned. */
export const isRunStatus = (value: string | null): value is MarketingRunStatus =>
  STATUSES.some((status) => status === value);

export const isRunWorkflow = (value: string | null): value is MarketingRunWorkflow =>
  WORKFLOWS.some((workflow) => workflow === value);

export const isOpenRun = (status: MarketingRunStatus): boolean => OPEN_STATUSES.includes(status);
