import { gql } from '@apollo/client';
import { SLACK_CHANNELS_SDL, SLACK_CONFIGURED_SDL } from '@duncit/slack';

/**
 * The two Slack reads this console still makes: the channel pickers on App
 * Builds and E2E settings. The Slack page itself lives in Communications.
 */
export type { SlackChannel } from '@duncit/slack';
export const SLACK_CONFIGURED = gql(SLACK_CONFIGURED_SDL);
export const SLACK_CHANNELS = gql(SLACK_CHANNELS_SDL);
