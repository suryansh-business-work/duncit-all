import { gql } from '@apollo/client';
import type { MarketingLeadPipeline, MarketingLeadStage } from '../leads-page/queries';

export type OutreachStepKind = 'EMAIL' | 'WHATSAPP' | 'DM_TASK' | 'WAIT';
export type OutreachEnrollmentStatus = 'ACTIVE' | 'REPLIED' | 'OPTED_OUT' | 'DONE' | 'FAILED' | 'PAUSED';
export type OutreachHistoryKind =
  | 'ENROLLED'
  | 'SENT'
  | 'SKIPPED'
  | 'FAILED'
  | 'TASK'
  | 'TASK_DONE'
  | 'REPLIED'
  | 'OPTED_OUT'
  | 'PAUSED'
  | 'RESUMED'
  | 'DONE';
export type OutreachTaskStatus = 'OPEN' | 'DONE' | 'CANCELLED';

export interface OutreachStep {
  kind: OutreachStepKind;
  wait_days: number;
  subject: string;
  body: string;
  wa_template_key: string;
  wa_params: string[];
}

export interface OutreachSequenceCounts {
  total: number;
  active: number;
  paused: number;
  replied: number;
  opted_out: number;
  done: number;
  failed: number;
}

export interface OutreachSequence {
  id: string;
  name: string;
  description: string;
  pipeline: MarketingLeadPipeline | null;
  steps: OutreachStep[];
  daily_limit: number;
  quiet_start_hour: number;
  quiet_end_hour: number;
  stop_on_reply: boolean;
  active: boolean;
  counts: OutreachSequenceCounts;
  sent_today: number;
  created_by: string;
  updated_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface OutreachHistoryEntry {
  at: string | null;
  kind: OutreachHistoryKind;
  step_index: number;
  text: string;
}

export interface OutreachEnrollment {
  id: string;
  sequence_id: string;
  sequence_name: string;
  lead_id: string;
  lead_name: string;
  lead_company: string;
  step_index: number;
  step_count: number;
  next_at: string | null;
  status: OutreachEnrollmentStatus;
  error: string;
  history: OutreachHistoryEntry[];
  created_at: string | null;
  updated_at: string | null;
}

export interface OutreachTask {
  id: string;
  sequence_id: string;
  sequence_name: string;
  enrollment_id: string;
  lead_id: string;
  lead_name: string;
  lead_instagram_handle: string;
  lead_instagram_url: string;
  step_index: number;
  text: string;
  status: OutreachTaskStatus;
  owner_user_id: string | null;
  owner_name: string | null;
  done_by_name: string;
  done_at: string | null;
  created_at: string | null;
}

export interface OutreachEnrollResult {
  enrolled: number;
  already: number;
  skipped: number;
}

export interface OutreachWaTemplate {
  key: string;
  description: string;
  template_name: string;
  status: string;
  approved: boolean;
  param_count: number;
  body: string;
}

export interface OutreachDraft {
  subject: string;
  body: string;
}

export interface OutreachStepInput {
  kind: OutreachStepKind;
  wait_days?: number;
  subject?: string;
  body?: string;
  wa_template_key?: string;
  wa_params?: string[];
}

export interface OutreachSequenceInput {
  name: string;
  description?: string;
  pipeline?: MarketingLeadPipeline | null;
  steps: OutreachStepInput[];
  daily_limit: number;
  quiet_start_hour?: number;
  quiet_end_hour?: number;
  stop_on_reply?: boolean;
}

export interface OutreachLeadFilter {
  pipeline?: MarketingLeadPipeline | null;
  stage?: MarketingLeadStage | null;
  city?: string | null;
}

const SEQUENCE_FIELDS = gql`
  fragment OutreachSequenceFields on OutreachSequence {
    id
    name
    description
    pipeline
    steps {
      kind
      wait_days
      subject
      body
      wa_template_key
      wa_params
    }
    daily_limit
    quiet_start_hour
    quiet_end_hour
    stop_on_reply
    active
    counts {
      total
      active
      paused
      replied
      opted_out
      done
      failed
    }
    sent_today
    created_by
    updated_by
    created_at
    updated_at
  }
`;

const ENROLLMENT_FIELDS = gql`
  fragment OutreachEnrollmentFields on OutreachEnrollment {
    id
    sequence_id
    sequence_name
    lead_id
    lead_name
    lead_company
    step_index
    step_count
    next_at
    status
    error
    history {
      at
      kind
      step_index
      text
    }
    created_at
    updated_at
  }
`;

const TASK_FIELDS = gql`
  fragment OutreachTaskFields on OutreachTask {
    id
    sequence_id
    sequence_name
    enrollment_id
    lead_id
    lead_name
    lead_instagram_handle
    lead_instagram_url
    step_index
    text
    status
    owner_user_id
    owner_name
    done_by_name
    done_at
    created_at
  }
`;

export const OUTREACH_SEQUENCES = gql`
  query OutreachSequences {
    outreachSequences {
      ...OutreachSequenceFields
    }
  }
  ${SEQUENCE_FIELDS}
`;

export const OUTREACH_ENROLLMENTS_TABLE = gql`
  query OutreachEnrollmentsTable($query: TableQueryInput) {
    outreachEnrollmentsTable(query: $query) {
      total
      rows {
        ...OutreachEnrollmentFields
      }
    }
  }
  ${ENROLLMENT_FIELDS}
`;

export const OUTREACH_TASKS = gql`
  query OutreachTasks {
    outreachTasks {
      ...OutreachTaskFields
    }
  }
  ${TASK_FIELDS}
`;

export const OUTREACH_WA_TEMPLATES = gql`
  query OutreachWaTemplates {
    outreachWaTemplates {
      key
      description
      template_name
      status
      approved
      param_count
      body
    }
  }
`;

export const OUTREACH_ENROLL_COUNT = gql`
  query OutreachEnrollCount($sequence_id: ID!, $filter: OutreachLeadFilter) {
    outreachEnrollCount(sequence_id: $sequence_id, filter: $filter)
  }
`;

export const SAVE_OUTREACH_SEQUENCE = gql`
  mutation SaveOutreachSequence($id: ID, $input: OutreachSequenceInput!) {
    saveOutreachSequence(id: $id, input: $input) {
      ...OutreachSequenceFields
    }
  }
  ${SEQUENCE_FIELDS}
`;

export const SET_OUTREACH_SEQUENCE_ACTIVE = gql`
  mutation SetOutreachSequenceActive($id: ID!, $active: Boolean!) {
    setOutreachSequenceActive(id: $id, active: $active) {
      ...OutreachSequenceFields
    }
  }
  ${SEQUENCE_FIELDS}
`;

export const ENROLL_LEADS = gql`
  mutation EnrollLeads($sequence_id: ID!, $filter: OutreachLeadFilter) {
    enrollLeads(sequence_id: $sequence_id, filter: $filter) {
      enrolled
      already
      skipped
    }
  }
`;

export const PAUSE_ENROLLMENT = gql`
  mutation PauseEnrollment($id: ID!) {
    pauseEnrollment(id: $id) {
      ...OutreachEnrollmentFields
    }
  }
  ${ENROLLMENT_FIELDS}
`;

export const RESUME_ENROLLMENT = gql`
  mutation ResumeEnrollment($id: ID!) {
    resumeEnrollment(id: $id) {
      ...OutreachEnrollmentFields
    }
  }
  ${ENROLLMENT_FIELDS}
`;

export const REMOVE_ENROLLMENT = gql`
  mutation RemoveEnrollment($id: ID!) {
    removeEnrollment(id: $id)
  }
`;

export const COMPLETE_OUTREACH_TASK = gql`
  mutation CompleteOutreachTask($id: ID!, $note: String) {
    completeOutreachTask(id: $id, note: $note) {
      ...OutreachTaskFields
    }
  }
  ${TASK_FIELDS}
`;

export const DRAFT_SEQUENCE_STEP = gql`
  mutation DraftSequenceStep($sequence_id: ID!, $step_index: Int!, $lead_id: ID) {
    draftSequenceStep(sequence_id: $sequence_id, step_index: $step_index, lead_id: $lead_id) {
      subject
      body
    }
  }
`;
