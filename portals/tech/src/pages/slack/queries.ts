import { gql } from '@apollo/client';
import {
  SEND_SLACK_MESSAGE_SDL,
  SLACK_CHANNELS_SDL,
  SLACK_CONFIGURED_SDL,
} from '@duncit/slack';

// Types + operation source are single-sourced from the shared @duncit/slack
// package so UI, native and server stay in lock-step; wrap the SDL with this
// portal's own Apollo `gql`.
export type { SlackChannel } from '@duncit/slack';

export const SLACK_CONFIGURED = gql(SLACK_CONFIGURED_SDL);

export const SLACK_CHANNELS = gql(SLACK_CHANNELS_SDL);

export const SEND_SLACK_MESSAGE = gql(SEND_SLACK_MESSAGE_SDL);
