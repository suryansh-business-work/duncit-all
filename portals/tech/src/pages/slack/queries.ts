import { gql } from '@apollo/client';
import {
  JOIN_SLACK_CHANNEL_SDL,
  SEND_SLACK_MESSAGE_SDL,
  SLACK_CHANNEL_HISTORY_SDL,
  SLACK_CHANNELS_SDL,
  SLACK_CONFIGURED_SDL,
  SLACK_PERMISSIONS_SDL,
} from '@duncit/slack';

// Types + operation source are single-sourced from the shared @duncit/slack
// package so UI, native and server stay in lock-step; wrap the SDL with this
// portal's own Apollo `gql`.
export type { SlackChannel, SlackMessage, SlackPermissions, SlackScope } from '@duncit/slack';

export const SLACK_CONFIGURED = gql(SLACK_CONFIGURED_SDL);

export const SLACK_CHANNELS = gql(SLACK_CHANNELS_SDL);

export const SLACK_CHANNEL_HISTORY = gql(SLACK_CHANNEL_HISTORY_SDL);

export const SEND_SLACK_MESSAGE = gql(SEND_SLACK_MESSAGE_SDL);

export const SLACK_PERMISSIONS = gql(SLACK_PERMISSIONS_SDL);

export const JOIN_SLACK_CHANNEL = gql(JOIN_SLACK_CHANNEL_SDL);

/**
 * Slack's own name for why it refused, e.g. `not_in_channel`.
 *
 * The server puts it in the error extensions rather than only in the message,
 * so the UI can offer the specific fix instead of parsing English out of a
 * string that is written for a human.
 */
export const slackErrorCode = (error: unknown): string => {
  const graphQLErrors = (error as { graphQLErrors?: { extensions?: Record<string, unknown> }[] })
    ?.graphQLErrors;
  const code = graphQLErrors?.[0]?.extensions?.slack_error;
  return typeof code === 'string' ? code : '';
};

/**
 * Slack's `ts` is epoch SECONDS with a microsecond fraction ("1723545600.001").
 * Date wants milliseconds, and passing the raw string lands in 1970.
 */
export const messageDate = (ts: string): Date => new Date(Number.parseFloat(ts) * 1000);

/** Messages posted on the same day group under one divider. */
export const messageDayKey = (ts: string): string => messageDate(ts).toDateString();
