import { gql } from '@apollo/client';

export const AGENT_AVAILABILITY = gql`
  query AgentAvailability {
    agentAvailability {
      is_available
      can_act
      max_batch
    }
  }
`;

export const AGENT_CHAT = gql`
  mutation AgentChat($input: AgentChatInput!) {
    agentChat(input: $input) {
      answer
      action
      requested
      created
      failed
      items {
        kind
        ok
        id
        ref
        title
        detail
        when
      }
    }
  }
`;

export interface AgentAvailability {
  is_available: boolean;
  can_act: boolean;
  max_batch: number;
}

export interface AgentResultItem {
  kind: string;
  ok: boolean;
  id: string | null;
  ref: string | null;
  title: string;
  detail: string;
  when: string | null;
}

export interface AgentReply {
  answer: string;
  action: string;
  requested: number;
  created: number;
  failed: number;
  items: AgentResultItem[];
}
