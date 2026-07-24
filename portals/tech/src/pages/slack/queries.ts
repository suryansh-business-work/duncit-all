import { gql } from '@apollo/client';

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  num_members: number;
  topic: string;
  link: string;
}

export const SLACK_CONFIGURED = gql`
  query SlackConfigured {
    slackConfigured
  }
`;

export const SLACK_CHANNELS = gql`
  query SlackChannels {
    slackChannels {
      id
      name
      is_private
      is_member
      num_members
      topic
      link
    }
  }
`;

export const SEND_SLACK_MESSAGE = gql`
  mutation SendSlackMessage($input: SendSlackMessageInput!) {
    sendSlackMessage(input: $input) {
      ok
      channel
      ts
    }
  }
`;
