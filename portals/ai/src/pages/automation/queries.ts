import { gql } from '@apollo/client';

const FLOW_FIELDS = `
  id name description channel status trigger run_count last_run_at created_at updated_at
  nodes { id kind x y data }
  edges { id source source_handle target }
  issues { node_id message }
`;

const RUN_FIELDS = `
  id flow_id flow_name channel mode deliver status
  contact { name phone email }
  trigger_text trigger_subject variables_json current_node_id error
  started_at finished_at resume_at wait_until
  steps { node_id kind status detail at }
  messages { id direction kind text subject html template_name buttons delivered at }
`;

export const AUTOMATION_FLOWS = gql`
  query AutomationFlows($channel: AutomationChannel!) {
    automationFlows(channel: $channel) { ${FLOW_FIELDS} }
  }
`;

export const AUTOMATION_FLOW = gql`
  query AutomationFlow($id: ID!) {
    automationFlow(id: $id) { ${FLOW_FIELDS} }
  }
`;

export const AUTOMATION_OPTIONS = gql`
  query AutomationOptions($channel: AutomationChannel!) {
    automationOptions(channel: $channel) {
      channel
      variables { name description }
      prompts { id name category kind }
      whatsapp_configured
      project_configured
      campaigns { name status template_name type media_url media_filename }
      templates {
        id name status category language body param_count header header_format needs_media footer buttons
        cta_buttons { type text url url_param }
      }
      saved_campaign_names { id name description }
      webhook_url
      webhook_secret_set
      email_senders { id name from_address is_default }
      email_templates { slug name subject variables }
      email_categories
      mailboxes { email display_name is_active }
    }
  }
`;

export const AUTOMATION_RUNS = gql`
  query AutomationRuns($flow_id: ID!, $mode: AutomationRunMode, $limit: Int) {
    automationRuns(flow_id: $flow_id, mode: $mode, limit: $limit) { ${RUN_FIELDS} }
  }
`;

export const SAVE_FLOW = gql`
  mutation SaveAutomationFlow($input: SaveAutomationFlowInput!) {
    saveAutomationFlow(input: $input) { ${FLOW_FIELDS} }
  }
`;

export const SET_FLOW_STATUS = gql`
  mutation SetAutomationFlowStatus($id: ID!, $status: AutomationFlowStatus!) {
    setAutomationFlowStatus(id: $id, status: $status) { ${FLOW_FIELDS} }
  }
`;

export const DELETE_FLOW = gql`
  mutation DeleteAutomationFlow($id: ID!) {
    deleteAutomationFlow(id: $id)
  }
`;

export const DUPLICATE_FLOW = gql`
  mutation DuplicateAutomationFlow($id: ID!) {
    duplicateAutomationFlow(id: $id) { ${FLOW_FIELDS} }
  }
`;

export const START_TEST = gql`
  mutation StartAutomationTest($input: AutomationTestInput!) {
    startAutomationTest(input: $input) { ${RUN_FIELDS} }
  }
`;

export const RESUME_TEST = gql`
  mutation ResumeAutomationTest($input: AutomationTestReplyInput!) {
    resumeAutomationTest(input: $input) { ${RUN_FIELDS} }
  }
`;

export const START_RUN = gql`
  mutation StartAutomationRun($flow_id: ID!, $contact: AutomationContactInput!, $text: String) {
    startAutomationRun(flow_id: $flow_id, contact: $contact, text: $text) { ${RUN_FIELDS} }
  }
`;

export const CANCEL_RUN = gql`
  mutation CancelAutomationRun($id: ID!) {
    cancelAutomationRun(id: $id) { ${RUN_FIELDS} }
  }
`;
