import { gql } from '@apollo/client';
import {
  SEND_SLACK_MESSAGE_SDL,
  SLACK_CHANNEL_HISTORY_SDL,
  SLACK_CHANNELS_SDL,
  SLACK_CONFIGURED_SDL,
} from '@duncit/slack';

// Types + operation source are single-sourced from the shared @duncit/slack
// package so UI, native and server stay in lock-step; wrap the SDL with this
// portal's own Apollo `gql`.
export type { SlackChannel, SlackMessage } from '@duncit/slack';

export const SLACK_CONFIGURED = gql(SLACK_CONFIGURED_SDL);

export const SLACK_CHANNELS = gql(SLACK_CHANNELS_SDL);

export const SLACK_CHANNEL_HISTORY = gql(SLACK_CHANNEL_HISTORY_SDL);

export const SEND_SLACK_MESSAGE = gql(SEND_SLACK_MESSAGE_SDL);

/**
 * Slack's `ts` is epoch SECONDS with a microsecond fraction ("1723545600.001").
 * Date wants milliseconds, and passing the raw string lands in 1970.
 */
export const messageDate = (ts: string): Date => new Date(Number.parseFloat(ts) * 1000);

/** Messages posted on the same day group under one divider. */
export const messageDayKey = (ts: string): string => messageDate(ts).toDateString();
