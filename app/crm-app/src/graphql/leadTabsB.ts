import { gql } from '@/generated/graphql';

/**
 * The lead page's Logos & Images, Survey, Website, Manual Logs, Communications
 * and Ask AI tabs — the same operations the CRM portal's tabs run, asking only
 * for the fields the app shows. Each tab reads its own data by lead id, so the
 * shared lead card query stays small.
 */

/* ── Logos & Images ─────────────────────────────────────────────── */

export const CrmAppLeadMediaDocument = gql(`
  query CrmAppLeadMedia($entity_type: CrmEntityType!, $lead_id: ID!) {
    crmLeadMedia(entity_type: $entity_type, lead_id: $lead_id) {
      id kind url name mime_type size_bytes width height
    }
  }
`);

export const CrmAppAddLeadMediaDocument = gql(`
  mutation CrmAppAddLeadMedia($entity_type: CrmEntityType!, $lead_id: ID!, $items: [CrmLeadMediaInput!]!) {
    addCrmLeadMedia(entity_type: $entity_type, lead_id: $lead_id, items: $items) { id }
  }
`);

export const CrmAppUpdateLeadMediaDocument = gql(`
  mutation CrmAppUpdateLeadMedia($id: ID!, $input: CrmLeadMediaUpdateInput!) {
    updateCrmLeadMedia(id: $id, input: $input) { id kind name }
  }
`);

export const CrmAppDeleteLeadMediaDocument = gql(`
  mutation CrmAppDeleteLeadMedia($id: ID!) {
    deleteCrmLeadMedia(id: $id)
  }
`);

/* ── Survey ─────────────────────────────────────────────────────── */

export const CrmAppLeadSurveyDocument = gql(`
  query CrmAppLeadSurvey($entity: LeadSurveyEntity!, $lead_id: ID!, $category_id: ID, $sub_category_id: ID) {
    leadSurvey(entity: $entity, lead_id: $lead_id, category_id: $category_id, sub_category_id: $sub_category_id) {
      survey { id title questions { qid type label help required multi options } }
      entries {
        id source token token_revoked generated_by filled submitted_at submitted_by created_at
        answers { qid value values }
      }
      categories { id name }
      sub_categories { id name }
    }
  }
`);

export const CrmAppSaveLeadSurveyDocument = gql(`
  mutation CrmAppSaveLeadSurvey($entity: LeadSurveyEntity!, $lead_id: ID!, $survey_id: ID!, $answers: [SurveyAnswerInput!]!) {
    saveLeadSurveyResponse(entity: $entity, lead_id: $lead_id, survey_id: $survey_id, answers: $answers) { id }
  }
`);

export const CrmAppGenerateSurveyLinkDocument = gql(`
  mutation CrmAppGenerateSurveyLink($entity: LeadSurveyEntity!, $lead_id: ID!, $survey_id: ID!) {
    generateLeadSurveyLink(entity: $entity, lead_id: $lead_id, survey_id: $survey_id) { id token }
  }
`);

export const CrmAppRevokeSurveyLinkDocument = gql(`
  mutation CrmAppRevokeSurveyLink($entry_id: ID!) {
    revokeLeadSurveyLink(entry_id: $entry_id)
  }
`);

export const CrmAppDeleteSurveyEntryDocument = gql(`
  mutation CrmAppDeleteSurveyEntry($entry_id: ID!) {
    deleteLeadSurveyEntry(entry_id: $entry_id)
  }
`);

/* ── Website pages ──────────────────────────────────────────────── */

/** The lead's website, which the Website tab scrapes (venue and host leads have the tab). */
export const CrmAppLeadWebsiteDocument = gql(`
  query CrmAppLeadWebsite($id: ID!, $venue: Boolean!, $host: Boolean!) {
    venue: venueLead(id: $id) @include(if: $venue) { id website }
    host: hostLead(id: $id) @include(if: $host) { id website }
  }
`);

export const CrmAppWebsitePagesDocument = gql(`
  query CrmAppWebsitePages($entity_type: CrmEntityType!, $lead_id: ID!) {
    crmWebsitePages(entity_type: $entity_type, lead_id: $lead_id) {
      id url title status content_text content_chars error
    }
  }
`);

export const CrmAppScrapeWebsiteDocument = gql(`
  mutation CrmAppScrapeWebsite($entity_type: CrmEntityType!, $lead_id: ID!, $limit: Int!) {
    crmScrapeWebsitePages(entity_type: $entity_type, lead_id: $lead_id, limit: $limit) { discovered saved }
  }
`);

export const CrmAppFetchWebsitePageDocument = gql(`
  mutation CrmAppFetchWebsitePage($id: ID!) {
    crmFetchWebsitePageContent(id: $id) { id status }
  }
`);

export const CrmAppDeleteWebsitePageDocument = gql(`
  mutation CrmAppDeleteWebsitePage($id: ID!) {
    crmDeleteWebsitePage(id: $id)
  }
`);

/* ── Manual logs ────────────────────────────────────────────────── */

/** A lead's timeline with everything the Manual Logs tab shows (authors, edits, deletes, who may change what). */
export const CrmAppLeadLogsDocument = gql(`
  query CrmAppLeadLogs($id: ID!, $venue: Boolean!, $host: Boolean!, $ecomm: Boolean!, $creator: Boolean!, $community: Boolean!) {
    venue: venueLead(id: $id) @include(if: $venue) { id activity_log { ...TabsBLog } }
    host: hostLead(id: $id) @include(if: $host) { id activity_log { ...TabsBLog } }
    ecomm: ecommLead(id: $id) @include(if: $ecomm) { id activity_log { ...TabsBLog } }
    creator: creatorLead(id: $id) @include(if: $creator) { id activity_log { ...TabsBLog } }
    community: communityLead(id: $id) @include(if: $community) { id activity_log { ...TabsBLog } }
  }
  fragment TabsBLog on CrmActivity {
    id type summary target body_html body_text created_by created_at updated_by updated_at
    deleted_by deleted_at is_deleted can_change
  }
`);

export const CrmAppAddManualLogDocument = gql(`
  mutation CrmAppAddManualLog($input: ManualLogInput!) {
    addCrmManualLog(input: $input) { id }
  }
`);

export const CrmAppUpdateManualLogDocument = gql(`
  mutation CrmAppUpdateManualLog($input: UpdateManualLogInput!) {
    updateCrmManualLog(input: $input) { id }
  }
`);

export const CrmAppDeleteManualLogDocument = gql(`
  mutation CrmAppDeleteManualLog($entity_type: CrmEntityType!, $entity_id: ID!, $log_id: ID!) {
    deleteCrmManualLog(entity_type: $entity_type, entity_id: $entity_id, log_id: $log_id) { id }
  }
`);

/** The names behind the user ids a lead page shows (log authors, editors), in one request. */
export const CrmAppUsersByIdsDocument = gql(`
  query CrmAppUsersByIds($ids: [ID!]!) {
    crmUsersByIds(ids: $ids) { id name email roles is_staff }
  }
`);

/** @mention search over the CRM team. */
export const CrmAppMentionSearchDocument = gql(`
  query CrmAppMentionSearch($search: String, $limit: Int) {
    crmAssignableUsers(search: $search, limit: $limit) { id name email }
  }
`);

/* ── Communications ─────────────────────────────────────────────── */

export const CrmAppLeadCommsDocument = gql(`
  query CrmAppLeadComms($filter: CommunicationLogFilter, $limit: Int, $offset: Int) {
    communicationLogs(filter: $filter, limit: $limit, offset: $offset) {
      total
      items {
        id type direction status subject provider_name contact_name contact_value error_message
        duration_seconds recording_url transcript transcript_status from_number created_at
        transcript_segments { seq speaker text at }
        summary { status text key_points sentiment outcome follow_ups reminder_id error }
      }
    }
  }
`);

export const CrmAppRequestTranscriptDocument = gql(`
  mutation CrmAppRequestTranscript($id: ID!) {
    requestCommunicationTranscript(id: $id) { id transcript_status }
  }
`);

export const CrmAppSummarizeCallDocument = gql(`
  mutation CrmAppSummarizeCall($id: ID!) {
    summarizeCommunicationLog(id: $id) { id summary { status } }
  }
`);

/* ── Ask AI ─────────────────────────────────────────────────────── */

export const CrmAppLeadAiThreadDocument = gql(`
  query CrmAppLeadAiThread($entity: CrmEntityType!, $lead_id: ID!) {
    crmLeadAiThread(entity: $entity, lead_id: $lead_id) {
      messages { ...TabsBAiMessage }
      context { ...TabsBAiContext }
    }
  }
  fragment TabsBAiMessage on CrmLeadAiMessage {
    id role content
    actions { type status to subject body_html reminder_id title due_at notes reminder_status result_message }
  }
  fragment TabsBAiContext on CrmLeadAiContext {
    total_tokens total_chars
    sources { key items chars tokens truncated }
  }
`);

export const CrmAppAskLeadAiDocument = gql(`
  mutation CrmAppAskLeadAi($entity: CrmEntityType!, $lead_id: ID!, $message: String!) {
    askCrmLeadAi(entity: $entity, lead_id: $lead_id, message: $message) {
      user_message { ...TabsBAiMessage }
      assistant_message { ...TabsBAiMessage }
      context { ...TabsBAiContext }
    }
  }
`);

export const CrmAppSetLeadAiActionDocument = gql(`
  mutation CrmAppSetLeadAiAction(
    $entity: CrmEntityType!
    $lead_id: ID!
    $message_id: ID!
    $action_index: Int!
    $status: CrmLeadAiActionStatus!
    $result_message: String
  ) {
    setCrmLeadAiActionStatus(
      entity: $entity
      lead_id: $lead_id
      message_id: $message_id
      action_index: $action_index
      status: $status
      result_message: $result_message
    ) { ...TabsBAiMessage }
  }
`);

export const CrmAppClearLeadAiDocument = gql(`
  mutation CrmAppClearLeadAi($entity: CrmEntityType!, $lead_id: ID!) {
    clearCrmLeadAiThread(entity: $entity, lead_id: $lead_id)
  }
`);
