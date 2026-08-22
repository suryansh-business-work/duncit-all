import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import {
  authStatus,
  channelHistory,
  isSlackConfigured,
  joinChannel,
  listChannels,
  postMessage,
  teamInfo,
  type PostMessageInput,
  type SlackChannel,
} from './slack.gateway';

/** Where a workspace admin changes what the bot may do. */
const SLACK_APPS_URL = 'https://api.slack.com/apps';
/** Slack's own reference for the scopes listed on the permissions panel. */
const SLACK_SCOPES_DOC_URL = 'https://api.slack.com/scopes';

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

/** The workspace URL without its trailing slash — what archive links hang off. */
const archiveBase = (teamUrl: string): string => teamUrl.replace(/\/$/, '');

/**
 * A channel plus the deep link that reaches it in Slack. One place, because
 * every channel this module returns needs it and `link` is non-null in the SDL.
 */
const withLink = (channel: SlackChannel, base: string) => ({
  ...channel,
  link: base ? `${base}/archives/${channel.id}` : '',
});

const optionalBool = (v: unknown): boolean | undefined => (v == null ? undefined : !!v);
const optionalStr = (v: string | null | undefined): string | undefined => {
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
    const base = archiveBase(team.url);
    return channels.map((c) => withLink(c, base));
  },

  /**
   * Recent messages in a channel, oldest first — what the Tech portal's Slack
   * page renders on the right of the channel list.
   *
   * Default 50: a screenful of context without asking Slack for a channel's
   * whole recent life on every poll.
   */
  history(channel: string, limit?: number | null) {
    if (!optionalStr(channel)) throw badInput('Select a channel to read');
    return channelHistory(channel, limit ?? 50);
  },

  /**
   * What the bot is allowed to do, scope by scope.
   *
   * Exists because every Slack failure this page can produce is really a
   * permissions question, and the answer lives in a header nobody can see.
   * Reported even when Slack refuses the call, since "the token is dead" is
   * itself the answer and throwing would leave the panel blank.
   */
  async permissions() {
    const base = {
      app_url: SLACK_APPS_URL,
      docs_url: SLACK_SCOPES_DOC_URL,
    };
    if (!(await isSlackConfigured())) {
      return { ...base, configured: false, team: '', scopes_known: false, error: '', scopes: [] };
    }
    try {
      const status = await authStatus();
      return { ...base, configured: true, error: '', ...status };
    } catch (err) {
      return {
        ...base,
        configured: true,
        team: '',
        scopes_known: false,
        scopes: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  /**
   * Add the bot to a public channel, which is what `not_in_channel` is asking
   * for. Private channels are refused here rather than at Slack: there is no
   * API that joins one, so the only fix is an invitation from inside it.
   */
  async join(channel: string) {
    const id = optionalStr(channel);
    if (!id) throw badInput('Select a channel to join');
    // Refused HERE, not at Slack. conversations.join answers a private channel
    // with `method_not_supported_for_channel_type`, which reads like a bug in
    // this code rather than the one thing the caller can actually act on.
    const known = await listChannels();
    const target = known.find((c) => c.id === id);
    if (target?.is_private) {
      throw badInput(
        `#${target.name} is private, and no Slack API can add a bot to a private channel. Someone already in it has to run /invite @your-bot there.`
      );
    }
    const [joined, team] = await Promise.all([joinChannel(id), teamInfo()]);
    logs.server.info('slack', 'join', { channel: id });
    // conversations.join answers with the channel but not always with
    // is_member, and the caller's whole question is whether it worked.
    return { ...withLink(joined, archiveBase(team.url)), is_member: true };
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
  /**
   * Announce an already-SAVED problem report on Slack.
   *
   * Returns instead of throwing when no channel is configured: the report is
   * already recorded by then, and refusing here is what used to throw the
   * user's feedback away over a missing env var. The caller writes whatever
   * comes back onto the row, so an un-announced report is visible in Support
   * rather than silently absent.
   */
  async announceFeedback(report: {
    report_no: string;
    category: string;
    message: string;
    who: string;
    platform: string;
    media_urls?: string[];
    blocks_json?: string | null;
    /**
     * The channel Support picked on Report a Problem settings. Wins over the
     * env entries, which stay as the fallback for an install that never picked
     * one — the caller owns the routing, this module owns the posting.
     */
    channel?: string | null;
  }): Promise<{ ts?: string | null; skipped?: string | null }> {
    const channel =
      optionalStr(report.channel) ??
      optionalStr(await getRuntimeEnvValue('SLACK_FEEDBACK_CHANNEL')) ??
      optionalStr(await getRuntimeEnvValue('SLACK_DEFAULT_CHANNEL'));
    if (!channel) {
      return { skipped: 'No Slack channel is configured for feedback' };
    }
    const body = parseJsonArray(report.blocks_json, 'Feedback') ?? [
      { type: 'section', text: { type: 'mrkdwn', text: report.message } },
    ];
    const media = (report.media_urls ?? []).filter(Boolean);
    const result = await postMessage({
      channel,
      text: `${report.report_no} · ${report.category} from ${report.who}: ${report.message}`,
      blocks: [
        ...body,
        ...(media.length > 0
          ? [
              {
                type: 'context',
                elements: [{ type: 'mrkdwn', text: media.map((u) => `<${u}|screenshot>`).join(' · ') }],
              },
            ]
          : []),
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `${report.report_no} · ${report.category} · by ${report.who} · ${report.platform}`,
            },
          ],
        },
      ],
    });
    logs.server.info('slack', 'feedback', {
      channel: result.channel,
      ts: result.ts,
      report_no: report.report_no,
    });
    return { ts: result.ts };
  },

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
