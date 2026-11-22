import { gql } from '@/generated/graphql';

/** Ask Duncit — the same operations and fields as mWeb's ask-duncit-page/queries.ts. */

export const AskDuncitBootstrapDocument = gql(`
  query MobileAskDuncitBootstrap($role: String, $page: AskDuncitPageInput) {
    askDuncitBootstrap(role: $role, page: $page, surface: NATIVE) {
      available
      unavailable_reason
      role_key
      can_write
      features {
        voice
        uploads
        memory
        proactive_alerts
        rollback
        handover
        chat_history
      }
      suggestions {
        id
        label_key
        label
      }
      alerts {
        id
        severity
        label_key
        params
        prompt_key
      }
      limits {
        max_input_chars
        max_attachments
        max_attachment_mb
      }
    }
  }
`);

export const AskDuncitConversationsDocument = gql(`
  query MobileAskDuncitConversations($before: String, $search: String) {
    askDuncitConversations(before: $before, search: $search, limit: 20) {
      items {
        id
        title
        role_key
        status
        last_message_at
      }
      has_more
    }
  }
`);

export const AskDuncitMessagesDocument = gql(`
  query MobileAskDuncitMessages($conversationId: ID!, $before: ID) {
    askDuncitMessages(conversation_id: $conversationId, before: $before, limit: 30) {
      items {
        id
        role
        content
        status
        attachments {
          url
          kind
          name
        }
        tool_calls {
          name
          title
          status
          action_id
        }
        actions {
          id
          tool
          tool_title
          risk
          args_preview
          status
          error_message
          can_rollback
          expires_at
        }
        knowledge_refs {
          id
          title
        }
        feedback_rating
        low_confidence
        out_of_context
        error_code
        created_at
      }
      has_more
    }
  }
`);

export const AskDuncitMessageDocument = gql(`
  query MobileAskDuncitMessage($id: ID!) {
    askDuncitMessage(id: $id) {
      id
      role
      content
      status
      attachments {
        url
        kind
        name
      }
      tool_calls {
        name
        title
        status
        action_id
      }
      actions {
        id
        tool
        tool_title
        risk
        args_preview
        status
        error_message
        can_rollback
        expires_at
      }
      knowledge_refs {
        id
        title
      }
      feedback_rating
      low_confidence
      out_of_context
      error_code
      created_at
    }
  }
`);

export const AskDuncitMemoryDocument = gql(`
  query MobileAskDuncitMemory {
    askDuncitMemory {
      id
      text
    }
  }
`);

export const SendAskDuncitDocument = gql(`
  mutation MobileSendAskDuncit($input: AskDuncitSendInput!) {
    sendAskDuncitMessage(input: $input) {
      conversation_id
      user_message_id
      message_id
      role_key
      status
    }
  }
`);

export const StopAskDuncitDocument = gql(`
  mutation MobileStopAskDuncit($messageId: ID!) {
    stopAskDuncitMessage(message_id: $messageId)
  }
`);

export const DecideAskDuncitActionDocument = gql(`
  mutation MobileDecideAskDuncitAction($id: ID!, $approve: Boolean!) {
    decideAskDuncitAction(id: $id, approve: $approve, surface: NATIVE) {
      id
      tool
      tool_title
      risk
      args_preview
      status
      error_message
      can_rollback
      expires_at
    }
  }
`);

export const RollbackAskDuncitActionDocument = gql(`
  mutation MobileRollbackAskDuncitAction($id: ID!) {
    rollbackAskDuncitAction(id: $id, surface: NATIVE) {
      id
      tool
      tool_title
      risk
      args_preview
      status
      error_message
      can_rollback
      expires_at
    }
  }
`);

export const RateAskDuncitDocument = gql(`
  mutation MobileRateAskDuncit($messageId: ID!, $rating: String!) {
    rateAskDuncitMessage(message_id: $messageId, rating: $rating) {
      id
      feedback_rating
    }
  }
`);

export const HandoverAskDuncitDocument = gql(`
  mutation MobileHandoverAskDuncit($conversationId: ID!, $team: String, $summary: String, $role: String) {
    handOverAskDuncitConversation(conversation_id: $conversationId, team: $team, summary: $summary, role: $role, surface: NATIVE) {
      ticket_id
      ticket_no
      already
    }
  }
`);

export const DeleteAskDuncitConversationDocument = gql(`
  mutation MobileDeleteAskDuncitConversation($id: ID!) {
    deleteAskDuncitConversation(id: $id)
  }
`);

export const ForgetAskDuncitFactDocument = gql(`
  mutation MobileForgetAskDuncitFact($id: String!) {
    forgetAskDuncitFact(id: $id)
  }
`);
