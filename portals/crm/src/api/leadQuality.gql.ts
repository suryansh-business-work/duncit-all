import { gql } from '@apollo/client';
import type {
  CrmLeadQualityAnalytics as GqlAnalytics,
  CrmLeadQualityConfig as GqlConfig,
  CrmLeadQualityDetails as GqlDetails,
  CrmLeadQualityEvent as GqlEvent,
  CrmLeadQualityIssue as GqlIssue,
  CrmLeadQualitySummary as GqlSummary,
} from '@duncit/gql-types';
import type { CrmLeadEntityType } from './crm.types';

/**
 * Lead Quality Score documents: settings (draft, publish, versions), one lead's
 * score with its evidence and history, recording evidence, recalculation and
 * analytics. Every selection constant below is brace-balanced on its own — the
 * document that interpolates it owns the braces it opens.
 */

export type LeadQualitySummary = Omit<GqlSummary, '__typename'>;
export type LeadQualityConfig = GqlConfig;
export type LeadQualityDetails = GqlDetails;
export type LeadQualityEvent = GqlEvent;
export type LeadQualityIssue = GqlIssue;
export type LeadQualityAnalytics = GqlAnalytics;

/** The summary every lead listing row carries (added to each *LeadsTable query). */
export const QUALITY_SUMMARY_FIELDS = `
  quality {
    score
    classification
    classification_label
    tone
    qualification
    verification
    failed_gates
    pending_gates
    pending_items
    config_version
    scored_at
  }
`;

const ACTOR = `id name`;

const CONFIG_FIELDS = `
  id
  lead_type
  version
  status
  min_qualification_score
  change_note
  revision
  weightage_total
  published_at
  archived_at
  created_at
  updated_at
  created_by { ${ACTOR} }
  updated_by { ${ACTOR} }
  published_by { ${ACTOR} }
  bands { key label min tone }
  criteria {
    key
    name
    weightage
    enabled
    mandatory
    auto_check
    threshold
    guidance
    sub_criteria { key name points mandatory auto_check threshold guidance }
  }
`;

const RESULT_FIELDS = `
  score
  max_score
  classification
  classification_label
  tone
  qualification
  verification
  min_qualification_score
  potential_score
  verified_items
  pending_items
  failed_items
  gates { key name state }
  criteria {
    key
    name
    max
    earned
    status
    mandatory
    items { key criterion_key sub_key name points earned status mandatory auto_check threshold guidance }
  }
`;

export const DETAILS_FIELDS = `
  entity_type
  lead_id
  lead_name
  scored_version
  published_version
  stale
  scored_at
  origin
  result { ${RESULT_FIELDS} }
  evidence { item_key status evidence source_url notes via decided_at actor { ${ACTOR} } }
  config { ${CONFIG_FIELDS} }
`;

const EVENT_FIELDS = `
  id
  kind
  entity_type
  lead_id
  trigger
  score_before
  score_after
  classification
  qualification
  config_version
  item_key
  status_before
  status_after
  evidence
  source_url
  via
  note
  created_at
  actor { ${ACTOR} }
`;

export const LEAD_QUALITY_SETTINGS = gql`
  query CrmLeadQualitySettings($lead_type: CrmEntityType!) {
    crmLeadQualitySettings(lead_type: $lead_type) {
      lead_type
      published { ${CONFIG_FIELDS} }
      draft { ${CONFIG_FIELDS} }
    }
  }
`;

export const LEAD_QUALITY_VERSIONS = gql`
  query CrmLeadQualityVersions($lead_type: CrmEntityType!) {
    crmLeadQualityVersions(lead_type: $lead_type) { ${CONFIG_FIELDS} }
  }
`;

export const LEAD_QUALITY_SETTINGS_HISTORY = gql`
  query CrmLeadQualitySettingsHistory($lead_type: CrmEntityType!, $limit: Int) {
    crmLeadQualitySettingsHistory(lead_type: $lead_type, limit: $limit) { ${EVENT_FIELDS} }
  }
`;

export const SAVE_LEAD_QUALITY_DRAFT = gql`
  mutation SaveCrmLeadQualityDraft($lead_type: CrmEntityType!, $input: CrmLeadQualityConfigInput!, $revision: Int, $change_note: String) {
    saveCrmLeadQualityDraft(lead_type: $lead_type, input: $input, revision: $revision, change_note: $change_note) { ${CONFIG_FIELDS} }
  }
`;

export const PUBLISH_LEAD_QUALITY_CONFIG = gql`
  mutation PublishCrmLeadQualityConfig($lead_type: CrmEntityType!, $revision: Int, $change_note: String) {
    publishCrmLeadQualityConfig(lead_type: $lead_type, revision: $revision, change_note: $change_note) {
      recalculation_job_id
      config { ${CONFIG_FIELDS} }
    }
  }
`;

export const DELETE_LEAD_QUALITY_DRAFT = gql`
  mutation DeleteCrmLeadQualityDraft($lead_type: CrmEntityType!) {
    deleteCrmLeadQualityDraft(lead_type: $lead_type)
  }
`;

export const START_LEAD_QUALITY_DRAFT_FROM_VERSION = gql`
  mutation StartCrmLeadQualityDraftFromVersion($lead_type: CrmEntityType!, $version: Int!) {
    startCrmLeadQualityDraftFromVersion(lead_type: $lead_type, version: $version) { ${CONFIG_FIELDS} }
  }
`;

export const LEAD_QUALITY = gql`
  query CrmLeadQuality($entity_type: CrmEntityType!, $lead_id: ID!) {
    crmLeadQuality(entity_type: $entity_type, lead_id: $lead_id) { ${DETAILS_FIELDS} }
  }
`;

export const LEAD_QUALITY_HISTORY = gql`
  query CrmLeadQualityHistory($entity_type: CrmEntityType!, $lead_id: ID!, $limit: Int) {
    crmLeadQualityHistory(entity_type: $entity_type, lead_id: $lead_id, limit: $limit) { ${EVENT_FIELDS} }
  }
`;

export const RECORD_LEAD_EVIDENCE = gql`
  mutation RecordCrmLeadEvidence($entity_type: CrmEntityType!, $lead_id: ID!, $decisions: [CrmLeadEvidenceDecisionInput!]!) {
    recordCrmLeadEvidence(entity_type: $entity_type, lead_id: $lead_id, decisions: $decisions) {
      skipped_checks
      details { ${DETAILS_FIELDS} }
    }
  }
`;

export const RECALCULATE_LEAD_QUALITY = gql`
  mutation RecalculateCrmLeadQuality($entity_type: CrmEntityType!, $lead_id: ID!, $external: Boolean) {
    recalculateCrmLeadQuality(entity_type: $entity_type, lead_id: $lead_id, external: $external) {
      skipped_checks
      details { ${DETAILS_FIELDS} }
    }
  }
`;

export const RECALCULATE_LEAD_QUALITY_SCORES = gql`
  mutation RecalculateCrmLeadQualityScores($entity_type: CrmEntityType!, $lead_ids: [ID!], $external: Boolean) {
    recalculateCrmLeadQualityScores(entity_type: $entity_type, lead_ids: $lead_ids, external: $external) {
      job_id
      total
    }
  }
`;

export const LEAD_QUALITY_ANALYTICS = gql`
  query CrmLeadQualityAnalytics($entity_type: CrmEntityType) {
    crmLeadQualityAnalytics(entity_type: $entity_type) {
      generated_at
      duplicate_leads
      by_type {
        entity_type
        total
        scored
        average_score
        qualified
        not_qualified
        pending_verification
        failed_gate_leads
        pending_items
        classifications { key label count }
        distribution { key label count }
      }
      top_leads { entity_type id name city score classification_label qualification }
      cities { city leads average_score qualified }
      trend { week leads average_score }
      conversion { classification label leads won conversion_rate }
      origins { origin leads average_score qualified }
      missing_evidence { entity_type criterion leads }
      research_queue { key label count average_score }
    }
  }
`;

export interface LeadQualityVars {
  entity_type: CrmLeadEntityType;
  lead_id: string;
}
