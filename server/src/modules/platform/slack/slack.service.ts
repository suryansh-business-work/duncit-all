import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import {
  isSlackConfigured,
  listChannels,
  postMessage,
  teamInfo,
  type PostMessageInput,
} from './slack.gateway';

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

/** Parse an optional JSON-array field (blocks / attachments) from the GraphQL
 * string input. Empty → undefined; malformed → a friendly BAD_USER_INPUT. */
function parseJsonArray(raw: string | null | undefined, field: string): unknown[] | undefined {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw badInput(`${field} must be valid JSON`);
  }
  if (!Array.isArray(parsed)) throw badInput(`${field} must be a JSON array`);
  return parsed;
}

const optionalBool = (v: unknown): boolean | undefined => (v == null ? undefined : !!v);
const optionalStr = (v: unknown): string | undefined => {
  const s = String(v ?? '').trim();
  return s || undefined;
};

export const slackService = {
  configured() {
    return isSlackConfigured();
  },

  /** Channels the bot can see, each with a deep archive link for copy/share. */
  async channels() {
    const [team, channels] = await Promise.all([teamInfo(), listChannels()]);
    const base = team.url.replace(/\/$/, '');
    return channels.map((c) => ({
      ...c,
      link: base ? `${base}/archives/${c.id}` : '',
    }));
  },

  /**
   * Post a message to a channel — the single entry point used by the Tech portal
   * test-send, client GraphQL callers, and server-side code. Supports the full
   * Slack surface (text/blocks/attachments/threads/mrkdwn/unfurls/identity).
   */
  async send(input: any) {
    const channel = optionalStr(input.channel) ?? (await getRuntimeEnvValue('SLACK_DEFAULT_CHANNEL'));
    if (!channel) throw badInput('Select a channel to post to');
    const text = optionalStr(input.text);
    const blocks = parseJsonArray(input.blocks_json, 'Blocks');
    const attachments = parseJsonArray(input.attachments_json, 'Attachments');
    if (!text && !blocks && !attachments) {
      throw badInput('Provide text, blocks or attachments to send');
    }
    const payload: PostMessageInput = {
      channel,
      text,
      blocks,
      attachments,
      thread_ts: optionalStr(input.thread_ts),
      reply_broadcast: optionalBool(input.reply_broadcast),
      mrkdwn: optionalBool(input.mrkdwn),
      unfurl_links: optionalBool(input.unfurl_links),
      unfurl_media: optionalBool(input.unfurl_media),
      link_names: optionalBool(input.link_names),
      icon_emoji: optionalStr(input.icon_emoji),
      username: optionalStr(input.username),
    };
    const result = await postMessage(payload);
    logs.server.info('slack', 'send', { channel: result.channel, ts: result.ts });
    return { ok: true, channel: result.channel, ts: result.ts };
  },

  /**
   * Post in-app feedback from a signed-in user. Identity is taken from the
   * authenticated context (never the client) and the channel is forced to the
   * feedback channel (or the default), so this stays safe to expose to every
   * user without the Slack-manage role.
   */
  async sendFeedback(user: { id: string; email?: string | null }, input: any) {
    const category = optionalStr(input.category);
    const message = optionalStr(input.message);
    if (!category || !message) {
      throw badInput('Category and message are required');
    }
    const channel =
      optionalStr(await getRuntimeEnvValue('SLACK_FEEDBACK_CHANNEL')) ??
      optionalStr(await getRuntimeEnvValue('SLACK_DEFAULT_CHANNEL'));
    if (!channel) {
      throw badInput('No Slack channel is configured for feedback');
    }
    const who = optionalStr(user.email) ?? user.id;
    const platform = optionalStr(input.platform) ?? 'app';
    const body = parseJsonArray(input.blocks_json, 'Feedback') ?? [
      { type: 'section', text: { type: 'mrkdwn', text: message } },
    ];
    const blocks = [
      ...body,
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `${category} · by ${who} · ${platform}` }],
      },
    ];
    const result = await postMessage({
      channel,
      text: `App feedback (${category}) from ${who}: ${message}`,
      blocks,
    });
    logs.server.info('slack', 'feedback', { channel: result.channel, ts: result.ts, category });
    return { ok: true, channel: result.channel, ts: result.ts };
  },
};
