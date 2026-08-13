import { gql } from '@apollo/client';

export type AskBotUnavailableReason = 'NOT_CONFIGURED';

export interface AskBotEntry {
  key: string;
  icon: string;
  is_available: boolean;
  unavailable_reason?: AskBotUnavailableReason | null;
}

export interface AskBotLink {
  surface_key: string;
  surface_name: string;
  label: string;
  path: string;
  /** Already resolved for this environment; empty when the surface has none. */
  url: string;
  has_access: boolean;
}

export interface AskBotReply {
  answer: string;
  links: AskBotLink[];
  followups: string[];
}

export const ASK_BOTS = gql`
  query AskBots {
    askBots {
      key
      icon
      is_available
      unavailable_reason
    }
  }
`;

export const ASK_BOT_CHAT = gql`
  mutation AskBotChat($input: AskBotChatInput!) {
    askBotChat(input: $input) {
      answer
      links {
        surface_key
        surface_name
        label
        path
        url
        has_access
      }
      followups
    }
  }
`;
