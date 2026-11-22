import { gql } from '@apollo/client';
import type {
  CrmLeadCandidate as GqlCandidate,
  CrmLeadCandidateApproval as GqlApproval,
  CrmLeadDiscoveryJob as GqlDiscoveryJob,
} from '@duncit/gql-types';

/**
 * CRM › Lead Research documents: the review queue, discovery jobs, and the
 * approve / reject actions. Selection constants are brace-balanced on their own.
 */

export type LeadCandidate = GqlCandidate;
export type LeadDiscoveryJob = GqlDiscoveryJob;
export type LeadCandidateApproval = GqlApproval;

export const CANDIDATE_FIELDS = `
  id
  lead_type
  job_id
  origin
  name
  city
  area
  address
  category
  description
  phones
  emails
  website
  instagram_handle
  instagram_url
  score
  qualification
  classification_label
  tone
  config_version
  missing_evidence
  status
  crm_lead_id
  decided_at
  decision_note
  skipped_checks
  created_at
  updated_at
  decided_by { id name }
  created_by { id name }
  duplicates { entity_type lead_id lead_name match }
  sources { kind url title text }
  evidence { item_key status evidence source_url notes via decided_at actor { id name } }
  result {
    score
    qualification
    gates { key name state }
    criteria { key name max earned status items { key name points earned status } }
  }
`;

const JOB_FIELDS = `
  id
  status
  label
  total
  succeeded
  failed
  error_message
  created_at
  finished_at
  lead_type
  city
  locality
  category
  keywords
  target_count
  min_score
  sources
  queries
  plan_note
  searches_run
  failures { id message }
  stats { found saved qualifying duplicates already_queued refused }
`;

export const LEAD_CANDIDATES_TABLE = gql`
  query CrmLeadCandidatesTable($query: TableQueryInput) {
    crmLeadCandidatesTable(query: $query) {
      total
      page
      page_size
      rows { ${CANDIDATE_FIELDS} }
    }
  }
`;

export const LEAD_CANDIDATE = gql`
  query CrmLeadCandidate($id: ID!) {
    crmLeadCandidate(id: $id) { ${CANDIDATE_FIELDS} }
  }
`;

export const LEAD_DISCOVERY_JOBS = gql`
  query CrmLeadDiscoveryJobs($limit: Int) {
    crmLeadDiscoveryJobs(limit: $limit) { ${JOB_FIELDS} }
  }
`;

export const START_LEAD_DISCOVERY = gql`
  mutation StartCrmLeadDiscovery($input: CrmLeadDiscoveryInput!) {
    startCrmLeadDiscovery(input: $input) { ${JOB_FIELDS} }
  }
`;

export const CANCEL_LEAD_DISCOVERY = gql`
  mutation CancelCrmLeadDiscovery($id: ID!) {
    cancelCrmLeadDiscovery(id: $id) { ${JOB_FIELDS} }
  }
`;

export const RETRY_LEAD_DISCOVERY = gql`
  mutation RetryCrmLeadDiscovery($id: ID!) {
    retryCrmLeadDiscovery(id: $id) { ${JOB_FIELDS} }
  }
`;

export const APPROVE_LEAD_CANDIDATES = gql`
  mutation ApproveCrmLeadCandidates($ids: [ID!]!, $allow_unqualified: Boolean, $note: String) {
    approveCrmLeadCandidates(ids: $ids, allow_unqualified: $allow_unqualified, note: $note) {
      candidate_id
      name
      outcome
      crm_lead_id
      message
    }
  }
`;

export const REJECT_LEAD_CANDIDATES = gql`
  mutation RejectCrmLeadCandidates($ids: [ID!]!, $note: String) {
    rejectCrmLeadCandidates(ids: $ids, note: $note)
  }
`;

export const VERIFY_LEAD_CANDIDATE = gql`
  mutation VerifyCrmLeadCandidateEvidence($id: ID!, $decisions: [CrmLeadEvidenceDecisionInput!]!, $external_checks: Boolean) {
    verifyCrmLeadCandidateEvidence(id: $id, decisions: $decisions, external_checks: $external_checks) { ${CANDIDATE_FIELDS} }
  }
`;
