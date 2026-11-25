import { gql } from '@/generated/graphql';

/**
 * CRM › Settings › Lead Quality Score — the portal's documents for one lead
 * type's scoring model: the published version and the draft, the version
 * history, the settings change log, and save / publish / discard / restore.
 */
export const CrmAppQualityConfigFields = gql(`
  fragment CrmAppQualityConfig on CrmLeadQualityConfig {
    id
    version
    status
    min_qualification_score
    change_note
    revision
    weightage_total
    published_at
    updated_at
    updated_by { name }
    published_by { name }
    bands { key label min tone }
    criteria {
      key name weightage enabled mandatory auto_check threshold guidance
      sub_criteria { key name points mandatory auto_check threshold guidance }
    }
  }
`);

export const CrmAppLeadQualitySettingsDocument = gql(`
  query CrmAppLeadQualitySettings($lead_type: CrmEntityType!) {
    crmLeadQualitySettings(lead_type: $lead_type) {
      lead_type
      published { ...CrmAppQualityConfig }
      draft { ...CrmAppQualityConfig }
    }
  }
`);

export const CrmAppLeadQualityVersionsDocument = gql(`
  query CrmAppLeadQualityVersions($lead_type: CrmEntityType!) {
    crmLeadQualityVersions(lead_type: $lead_type) {
      id version status weightage_total published_at change_note published_by { name }
    }
  }
`);

export const CrmAppLeadQualitySettingsHistoryDocument = gql(`
  query CrmAppLeadQualitySettingsHistory($lead_type: CrmEntityType!, $limit: Int) {
    crmLeadQualitySettingsHistory(lead_type: $lead_type, limit: $limit) {
      id kind config_version note created_at actor { name }
    }
  }
`);

export const CrmAppSaveLeadQualityDraftDocument = gql(`
  mutation CrmAppSaveLeadQualityDraft(
    $lead_type: CrmEntityType!
    $input: CrmLeadQualityConfigInput!
    $revision: Int
    $change_note: String
  ) {
    saveCrmLeadQualityDraft(lead_type: $lead_type, input: $input, revision: $revision, change_note: $change_note) {
      id version revision
    }
  }
`);

export const CrmAppPublishLeadQualityConfigDocument = gql(`
  mutation CrmAppPublishLeadQualityConfig($lead_type: CrmEntityType!, $revision: Int, $change_note: String) {
    publishCrmLeadQualityConfig(lead_type: $lead_type, revision: $revision, change_note: $change_note) {
      recalculation_job_id
      config { id version }
    }
  }
`);

export const CrmAppDeleteLeadQualityDraftDocument = gql(`
  mutation CrmAppDeleteLeadQualityDraft($lead_type: CrmEntityType!) {
    deleteCrmLeadQualityDraft(lead_type: $lead_type)
  }
`);

export const CrmAppStartLeadQualityDraftDocument = gql(`
  mutation CrmAppStartLeadQualityDraft($lead_type: CrmEntityType!, $version: Int!) {
    startCrmLeadQualityDraftFromVersion(lead_type: $lead_type, version: $version) { id version }
  }
`);
