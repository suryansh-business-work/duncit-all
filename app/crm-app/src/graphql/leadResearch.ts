import { gql } from '@/generated/graphql';

/**
 * CRM › Lead Research — the portal page's own operations: the review queue,
 * one candidate, the discoveries, and add-to-CRM / reject.
 */
export const CrmAppLeadCandidatesDocument = gql(`
  query CrmAppLeadCandidates($query: TableQueryInput) {
    crmLeadCandidatesTable(query: $query) {
      total
      rows { id lead_type name city score qualification classification_label status created_at }
    }
  }
`);

export const CrmAppLeadCandidateDocument = gql(`
  query CrmAppLeadCandidate($id: ID!) {
    crmLeadCandidate(id: $id) {
      id lead_type origin name city area address category description phones emails website
      instagram_handle instagram_url score qualification classification_label missing_evidence
      status crm_lead_id decided_at decision_note
      duplicates { entity_type lead_id lead_name match }
      sources { kind url title }
    }
  }
`);

export const CrmAppDiscoveryJobsDocument = gql(`
  query CrmAppDiscoveryJobs($limit: Int) {
    crmLeadDiscoveryJobs(limit: $limit) {
      id status label total succeeded failed error_message created_at finished_at
      lead_type city locality category
      stats { found saved qualifying duplicates }
    }
  }
`);

export const CrmAppStartDiscoveryDocument = gql(`
  mutation CrmAppStartDiscovery($input: CrmLeadDiscoveryInput!) {
    startCrmLeadDiscovery(input: $input) { id label }
  }
`);

export const CrmAppCancelDiscoveryDocument = gql(`
  mutation CrmAppCancelDiscovery($id: ID!) {
    cancelCrmLeadDiscovery(id: $id) { id status }
  }
`);

export const CrmAppRetryDiscoveryDocument = gql(`
  mutation CrmAppRetryDiscovery($id: ID!) {
    retryCrmLeadDiscovery(id: $id) { id status }
  }
`);

export const CrmAppApproveCandidatesDocument = gql(`
  mutation CrmAppApproveCandidates($ids: [ID!]!, $allow_unqualified: Boolean) {
    approveCrmLeadCandidates(ids: $ids, allow_unqualified: $allow_unqualified) {
      candidate_id name outcome crm_lead_id message
    }
  }
`);

export const CrmAppRejectCandidatesDocument = gql(`
  mutation CrmAppRejectCandidates($ids: [ID!]!, $note: String) {
    rejectCrmLeadCandidates(ids: $ids, note: $note)
  }
`);
