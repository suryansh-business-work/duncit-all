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
  blocks_json?: string;
}
