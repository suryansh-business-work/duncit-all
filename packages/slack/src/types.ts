/** Shared Slack contracts. Mirrors the server `SendSlackMessageInput` /
 * `slackChannels` GraphQL shapes so UI, native and server stay in lock-step. */

export type SlackTextType = 'mrkdwn' | 'plain_text';

export interface SlackTextObject {
  type: SlackTextType;
  text: string;
  emoji?: boolean;
}

/** A Block Kit block or block element. Kept loose (index signature) so the
 * builders can attach block-specific keys without a type per block kind. */
export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export type SlackButtonStyle = 'primary' | 'danger';

export interface SlackButtonOptions {
  url?: string;
  value?: string;
  actionId?: string;
  style?: SlackButtonStyle;
}

/** A channel as returned by the server `slackChannels` query. */
export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  num_members: number;
  topic: string;
  link: string;
}

/** One thing the bot is, or is not, allowed to do. */
export interface SlackScope {
  scope: string;
  granted: boolean;
  /** False for scopes that only buy a convenience — a missing one is not a fault. */
  required: boolean;
  purpose: string;
}

/** What the installed bot token may actually do, as returned by `slackPermissions`. */
export interface SlackPermissions {
  configured: boolean;
  team: string;
  /**
   * False when Slack did not report the scopes. Every entry's `granted` is then
   * unknown rather than false — a working token can decline to say.
   */
  scopes_known: boolean;
  scopes: SlackScope[];
  /** Why the scopes could not be read. Empty when they were. */
  error: string;
  app_url: string;
  docs_url: string;
}

/**
 * One message already in a channel, as returned by `slackChannelHistory`.
 *
 * Authors come off Slack as opaque ids; the name and avatar are resolved
 * server-side from the workspace directory, because only the server holds the
 * bot token that can ask.
 */
export interface SlackMessage {
  /** Slack's own message id — the epoch-seconds timestamp it was posted at. */
  ts: string;
  user_id: string;
  user_name: string;
  avatar: string;
  text: string;
  is_bot: boolean;
  reply_count: number;
}

/** Rich, ergonomic options a caller composes — `blocks`/`attachments` are
 * arrays here and get serialised to JSON by `buildSlackMessageInput`. */
export interface SlackMessageOptions {
  channel?: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: unknown[];
  thread_ts?: string;
  reply_broadcast?: boolean;
  mrkdwn?: boolean;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  link_names?: boolean;
  icon_emoji?: string;
  username?: string;
}

/** The flat mutation input the server accepts (blocks/attachments as JSON). */
export interface SendSlackMessageInput {
  channel?: string;
  text?: string;
  blocks_json?: string;
  attachments_json?: string;
  thread_ts?: string;
  reply_broadcast?: boolean;
  mrkdwn?: boolean;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  link_names?: boolean;
  icon_emoji?: string;
  username?: string;
}

export interface SendSlackMessageResult {
  ok: boolean;
  channel: string;
  ts: string;
  error?: string | null;
}

export type FeedbackCategory = 'Bug' | 'Idea' | 'Question' | 'Other';

/** Input for the authed `submitAppFeedback` mutation. The server stamps the
 * real user identity + routes the channel; the client only supplies content. */
export interface AppFeedbackInput {
  category: string;
  message: string;
  platform?: string;
  /** Screenshots the reporter attached. */
  media_urls?: string[];
  app_version?: string;
  /** Device context — a bug report without it cannot be reproduced. */
  device_os?: string;
  device_model?: string;
  /** The screen the reporter was on when they opened the form. */
  source_screen?: string;
  blocks_json?: string;
}
