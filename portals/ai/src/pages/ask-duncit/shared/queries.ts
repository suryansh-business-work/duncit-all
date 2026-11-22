import { gql } from '@apollo/client';

/** Ask Duncit — the AI portal's reads. Mutations are in ./mutations.ts. */

const AUDIT_ROW = gql`
  fragment AiAskDuncitAuditRow on AskDuncitAuditRow {
    id
    type
    severity
    status
    user_id
    user_name
    role_key
    account_roles
    conversation_id
    message_id
    action_id
    surface
    locale
    page_route
    entity_type
    entity_id
    query
    response
    model
    total_tokens
    cost_usd
    tool
    tool_args
    violation_kind
    reason
    error_code
    error_message
    latency_ms
    detail
    intact
    created_at
  }
`;

export const ASK_DUNCIT_AUDIT_TABLE = gql`
  query AiAskDuncitAuditTable($query: TableQueryInput, $preset: AskDuncitAuditPreset) {
    askDuncitAuditTable(query: $query, preset: $preset) {
      rows {
        ...AiAskDuncitAuditRow
      }
      total
      page
      page_size
    }
  }
  ${AUDIT_ROW}
`;

const CONVERSATION_ROW = gql`
  fragment AiAskDuncitConversationRow on AskDuncitConversationRow {
    id
    user_id
    title
    role_key
    status
    surface
    message_count
    generating
    last_message_at
    last_message_preview
    out_of_context_count
    violation_count
    thumbs_up
    thumbs_down
    total_tokens
    cost_usd
    handover_team
    handover_ticket_id
  }
`;

export const ASK_DUNCIT_CONVERSATIONS_TABLE = gql`
  query AiAskDuncitConversationsTable($query: TableQueryInput, $live: Boolean) {
    askDuncitConversationsTable(query: $query, live: $live) {
      rows {
        ...AiAskDuncitConversationRow
      }
      total
      page
      page_size
    }
  }
  ${CONVERSATION_ROW}
`;

export const ASK_DUNCIT_CONVERSATION_DETAIL = gql`
  query AiAskDuncitConversationDetail($id: ID!) {
    askDuncitConversationDetail(id: $id) {
      conversation {
        ...AiAskDuncitConversationRow
      }
      messages {
        id
        role
        status
        content
        tool_calls
        model
        tokens
        latency_ms
        confidence
        out_of_context
        feedback_rating
        attachments
        created_at
      }
      actions {
        id
        tool_title
        risk
        status
        args_preview
        error_message
        created_at
      }
      events {
        ...AiAskDuncitAuditRow
      }
    }
  }
  ${CONVERSATION_ROW}
  ${AUDIT_ROW}
`;

export const ASK_DUNCIT_VERIFY_AUDIT = gql`
  query AiAskDuncitVerifyAudit($id: ID!) {
    askDuncitVerifyAudit(id: $id)
  }
`;

export const ASK_DUNCIT_DASHBOARD = gql`
  query AiAskDuncitDashboard($days: Int) {
    askDuncitDashboard(days: $days) {
      days
      conversations
      active_users
      messages
      resolution_rate
      avg_response_ms
      avg_first_token_ms
      avg_confidence
      total_tokens
      cost_usd
      tool_calls
      failed_actions
      errors
      handovers
      out_of_context
      violations
      thumbs_up
      thumbs_down
      satisfaction
      daily {
        date
        messages
        violations
        failed_actions
        users
      }
      role_usage {
        role_key
        messages
        users
      }
      top_tools {
        tool
        calls
        failures
      }
      violation_kinds {
        kind
        count
      }
    }
  }
`;

export const ASK_DUNCIT_COST = gql`
  query AiAskDuncitCost($days: Int) {
    askDuncitCost(days: $days) {
      days
      total_cost_usd
      total_tokens
      by_task {
        key
        calls
        tokens
        cost
      }
      by_model {
        key
        calls
        tokens
        cost
      }
      by_day {
        date
        calls
        tokens
        cost
      }
      by_role {
        key
        tokens
        cost
      }
      unpriced_models
    }
  }
`;

export const ASK_DUNCIT_SETTINGS = gql`
  query AiAskDuncitSettings {
    askDuncitSettings {
      enabled
      kill_switch
      kill_switch_reason
      default_model
      evaluator_model
      transcription_model
      speech_model
      speech_voice
      temperature
      max_output_tokens
      max_tool_rounds
      history_turns
      max_input_chars
      max_attachments
      max_attachment_mb
      low_confidence_threshold
      features {
        voice
        uploads
        memory
        proactive_alerts
        knowledge_base
        write_actions
        evaluation
        rollback
        handover
        chat_history
      }
      roles {
        role_key
        enabled
        kill_switch
        model
        max_output_tokens
        allow_write
        allowed_categories
        allowed_tools
        blocked_tools
        approval_tools
        approve_all_writes
        messages_per_minute
        messages_per_day
        tokens_per_day
        instructions
      }
      updated_at
    }
  }
`;

export const ASK_DUNCIT_FEEDBACK_TABLE = gql`
  query AiAskDuncitFeedbackTable($query: TableQueryInput) {
    askDuncitFeedbackTable(query: $query) {
      rows {
        id
        conversation_id
        user_id
        content
        confidence
        low_confidence
        rating
        comment
        review_status
        review_note
        model
        created_at
      }
      total
      page
      page_size
    }
  }
`;

export const ASK_DUNCIT_KNOWLEDGE_TABLE = gql`
  query AiAskDuncitKnowledgeTable($query: TableQueryInput) {
    askDuncitKnowledgeTable(query: $query) {
      rows {
        id
        title
        kind
        audience_roles
        tags
        locale
        status
        version
        hits
        updated_at
      }
      total
      page
      page_size
    }
  }
`;

export const ASK_DUNCIT_KNOWLEDGE_ARTICLE = gql`
  query AiAskDuncitKnowledgeArticle($id: ID!) {
    askDuncitKnowledgeArticle(id: $id) {
      id
      title
      body
      kind
      audience_roles
      tags
      locale
      status
    }
  }
`;

export const ASK_DUNCIT_TOOL_TABLE = gql`
  query AiAskDuncitToolTable($query: TableQueryInput, $role: AskDuncitRoleKey!) {
    askDuncitToolTable(query: $query, role: $role) {
      rows {
        name
        title
        summary
        category
        category_label
        risk
        confirm
        outward
        allowed
        blocked
        explicitly_allowed
        approval_required
        calls
        failures
      }
      total
      page
      page_size
    }
  }
`;

export const ASK_DUNCIT_TOOL_CATEGORIES = gql`
  query AiAskDuncitToolCategories {
    askDuncitToolCategories {
      key
      label
      tools
    }
  }
`;

export const ASK_DUNCIT_PROMPT_KEYS = gql`
  query AiAskDuncitPromptKeys {
    askDuncitPromptKeys
  }
`;
