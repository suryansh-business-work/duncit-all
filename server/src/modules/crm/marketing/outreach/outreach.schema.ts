import gql from 'graphql-tag';

/** Outreach › Sequences: multi-step outreach to marketing leads, stopped by a reply or an opt-out. */
export const outreachTypeDefs = gql`
  "EMAIL and WHATSAPP send on their own; DM_TASK asks a person to send a DM by hand; WAIT holds the next step for wait_days."
  enum OutreachStepKind {
    EMAIL
    WHATSAPP
    DM_TASK
    WAIT
  }

  "ACTIVE walks on; PAUSED waits for a manager; REPLIED, OPTED_OUT and DONE are over; FAILED stopped on a send that did not go."
  enum OutreachEnrollmentStatus {
    ACTIVE
    REPLIED
    OPTED_OUT
    DONE
    FAILED
    PAUSED
  }

  enum OutreachHistoryKind {
    ENROLLED
    SENT
    SKIPPED
    FAILED
    TASK
    TASK_DONE
    REPLIED
    OPTED_OUT
    PAUSED
    RESUMED
    DONE
  }

  enum OutreachTaskStatus {
    OPEN
    DONE
    CANCELLED
  }

  type OutreachStep {
    kind: OutreachStepKind!
    "WAIT only: days before the next step."
    wait_days: Int!
    "EMAIL only."
    subject: String!
    "The email text or the DM; {name} and {company} are filled per lead."
    body: String!
    "WHATSAPP only: the AiSensy campaign name picked from the Communications portal's list."
    wa_template_key: String!
    "WHATSAPP only: the template's values, in order; {name} and {company} are filled per lead."
    wa_params: [String!]!
  }

  "How many enrollments sit in each state."
  type OutreachSequenceCounts {
    total: Int!
    active: Int!
    paused: Int!
    replied: Int!
    opted_out: Int!
    done: Int!
    failed: Int!
  }

  type OutreachSequence {
    id: ID!
    name: String!
    description: String!
    "Only leads of this pipeline may be enrolled; null takes any."
    pipeline: MarketingLeadPipeline
    steps: [OutreachStep!]!
    "Sends and DM tasks a day across the sequence, on the admin's clock."
    daily_limit: Int!
    "Nothing goes out from this hour until quiet_end_hour, in the admin's time zone; equal hours mean no quiet window."
    quiet_start_hour: Int!
    quiet_end_hour: Int!
    stop_on_reply: Boolean!
    active: Boolean!
    counts: OutreachSequenceCounts!
    "Sends and DM tasks made today, against daily_limit."
    sent_today: Int!
    created_by: String!
    updated_by: String!
    created_at: String
    updated_at: String
  }

  type OutreachHistoryEntry {
    at: String
    kind: OutreachHistoryKind!
    "The step it happened on; -1 when it was not about a step."
    step_index: Int!
    text: String!
  }

  type OutreachEnrollment {
    id: ID!
    sequence_id: ID!
    sequence_name: String!
    lead_id: ID!
    lead_name: String!
    lead_company: String!
    "The step that runs next."
    step_index: Int!
    step_count: Int!
    "When the next step falls due; null while a DM task is open or the enrollment is not ACTIVE."
    next_at: String
    status: OutreachEnrollmentStatus!
    error: String!
    history: [OutreachHistoryEntry!]!
    created_at: String
    updated_at: String
  }

  type OutreachEnrollmentTablePage {
    rows: [OutreachEnrollment!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "A DM a person sends by hand, then marks done here. Nothing is sent for them."
  type OutreachTask {
    id: ID!
    sequence_id: ID!
    sequence_name: String!
    enrollment_id: ID!
    lead_id: ID!
    lead_name: String!
    lead_instagram_handle: String!
    lead_instagram_url: String!
    step_index: Int!
    "The DM to send, with the lead's name and company filled in."
    text: String!
    status: OutreachTaskStatus!
    owner_user_id: String
    owner_name: String
    done_by_name: String!
    done_at: String
    created_at: String
  }

  type OutreachEnrollResult {
    "Leads enrolled now."
    enrolled: Int!
    "Leads already in the sequence; left as they were."
    already: Int!
    "Leads the sequence does not take: another pipeline, converted or lost, or not found."
    skipped: Int!
  }

  "An AiSensy campaign from the Communications portal's list, with whether its template is approved. Only an approved one can be sent."
  type OutreachWaTemplate {
    key: String!
    description: String!
    template_name: String!
    "AiSensy's own status for the template; empty when it could not be read."
    status: String!
    approved: Boolean!
    "How many values the template takes; 0 when it could not be read."
    param_count: Int!
    body: String!
  }

  type OutreachDraft {
    subject: String!
    body: String!
  }

  input OutreachStepInput {
    kind: OutreachStepKind!
    wait_days: Int
    subject: String
    body: String
    wa_template_key: String
    wa_params: [String!]
  }

  input OutreachSequenceInput {
    name: String!
    description: String
    pipeline: MarketingLeadPipeline
    steps: [OutreachStepInput!]!
    daily_limit: Int!
    quiet_start_hour: Int
    quiet_end_hour: Int
    stop_on_reply: Boolean
  }

  "Which leads an enroll by filter takes; every field narrows."
  input OutreachLeadFilter {
    pipeline: MarketingLeadPipeline
    stage: MarketingLeadStage
    city: String
  }

  extend type Query {
    "Every sequence, newest first, with its enrollment counts."
    outreachSequences: [OutreachSequence!]!
    outreachSequence(id: ID!): OutreachSequence!
    "Enrollments, newest first; filter by sequence_id, lead_id or status; search the lead's name or company."
    outreachEnrollmentsTable(query: TableQueryInput): OutreachEnrollmentTablePage!
    "The open DM tasks, oldest first."
    outreachTasks: [OutreachTask!]!
    "The WhatsApp campaigns a step may pick, approved ones first."
    outreachWaTemplates: [OutreachWaTemplate!]!
    "How many leads an enroll with this filter would take into the sequence now."
    outreachEnrollCount(sequence_id: ID!, filter: OutreachLeadFilter): Int!
  }

  extend type Mutation {
    "Create (no id) or edit a sequence. A Marketing Editor may only save one that is not active."
    saveOutreachSequence(id: ID, input: OutreachSequenceInput!): OutreachSequence!
    "Switch a sequence on or off. Managers only; switching on re-checks every step."
    setOutreachSequenceActive(id: ID!, active: Boolean!): OutreachSequence!
    "Enroll the given leads, or every lead matching the filter. A lead already in the sequence is left as it is. Managers only."
    enrollLeads(sequence_id: ID!, lead_ids: [ID!], filter: OutreachLeadFilter): OutreachEnrollResult!
    pauseEnrollment(id: ID!): OutreachEnrollment!
    "Carry on a paused enrollment, or retry the step a failed one stopped on."
    resumeEnrollment(id: ID!): OutreachEnrollment!
    "Take the lead out of the sequence; what was sent stays on record."
    removeEnrollment(id: ID!): Boolean!
    "Say the DM was sent; the lead's walk carries on from the next step."
    completeOutreachTask(id: ID!, note: String): OutreachTask!
    "Claude drafts the step's text, for one lead when lead_id is given. Nothing is saved."
    draftSequenceStep(sequence_id: ID!, step_index: Int!, lead_id: ID): OutreachDraft!
  }
`;
