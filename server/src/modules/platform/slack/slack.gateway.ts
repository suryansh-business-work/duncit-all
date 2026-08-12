import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

/**
 * Slack gateway — thin Web API wrapper. The bot token is owned by the Tech
 * portal (SLACK env category), never `.env`, read fresh via
 * {@link getRuntimeEnvValue}. No SDK — every call is a single REST request.
 * Slack always replies HTTP 200; the JSON body's `ok` flag decides success.
 */
const SLACK_API = 'https://slack.com/api';

/**
 * BOT TOKEN SCOPES, per method — the list nobody should have to rediscover
 * from a `missing_scope` error again.
 *
 *   conversations.list    channels:read     list public channels
 *                         groups:read       list private channels
 *   team.info             team:read         workspace domain, for archive links
 *   chat.postMessage      chat:write        post messages + in-app feedback
 *   conversations.history channels:history  read a public channel's messages
 *                         groups:history    read a private channel's messages
 *   users.list            users:read        names + avatars for those messages
 *
 * Slack binds scopes to the token at INSTALL time, so a missing scope cannot be
 * fixed from this codebase — it is a workspace-admin action:
 *
 *   api.slack.com/apps -> the app -> OAuth & Permissions -> Bot Token Scopes
 *   -> add the scope -> "Reinstall to Workspace" -> paste the new xoxb- token
 *   into the Tech portal (Environment Variables -> Slack).
 *
 * The existing token keeps its old scope set until the app is reinstalled, so
 * adding the scope without reinstalling changes nothing.
 *
 * Scope is necessary but not sufficient for private channels: the bot only
 * sees a private channel it has been invited to (`/invite @the-bot`).
 */
const REQUIRED_SCOPES = new Map<string, string[]>([
  ['conversations.list', ['channels:read', 'groups:read']],
  ['team.info', ['team:read']],
  ['chat.postMessage', ['chat:write']],
  ['conversations.history', ['channels:history', 'groups:history']],
  ['users.list', ['users:read']],
]);

/** Every scope this gateway needs, deduped. */
export const SLACK_BOT_SCOPES: string[] = [...new Set([...REQUIRED_SCOPES.values()].flat())];

/** Slack sends scope lists as a comma string, sometimes with stray spaces. */
const parseScopes = (raw: string | null | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

/**
 * Which of {@link SLACK_BOT_SCOPES} a token does NOT hold. `granted` is the
 * comma list Slack returns in the `x-oauth-scopes` response header, so a freshly
 * pasted token can be vetted before a call fails on it.
 */
export function missingBotScopes(granted: string): string[] {
  const held = new Set(parseScopes(granted));
  return SLACK_BOT_SCOPES.filter((scope) => !held.has(scope));
}

/** Slack errors that mean the token itself is dead, not the call. */
const TOKEN_ERRORS = new Set([
  'invalid_auth',
  'not_authed',
  'account_inactive',
  'token_revoked',
  'token_expired',
]);

const REINSTALL_HINT =
  'Add it at api.slack.com/apps -> your app -> OAuth & Permissions -> Bot Token Scopes, then reinstall the app to the workspace and paste the new token into Environment Variables -> Slack.';

/** Name the exact scope Slack asked for, so the fix needs no guesswork. */
function missingScopeMessage(method: string, data: any): string {
  const needed = parseScopes(data.needed);
  const required = needed.length > 0 ? needed : (REQUIRED_SCOPES.get(method) ?? []);
  const provided = parseScopes(data.provided);
  const has = provided.length > 0 ? ` The token currently has: ${provided.join(', ')}.` : '';
  return `Slack rejected ${method}: missing_scope — the bot token needs the scope ${required.join(', ')}. ${REINSTALL_HINT}${has}`;
}

function slackFailureMessage(method: string, error: string, data: any): string {
  if (error === 'missing_scope') return missingScopeMessage(method, data);
  if (TOKEN_ERRORS.has(error)) {
    return `Slack rejected ${method}: ${error} — the bot token is no longer valid. Reinstall the Slack app and paste the new xoxb- token into Environment Variables -> Slack.`;
  }
  return `Slack rejected ${method}: ${error}.`;
}

/**
 * Turn Slack's `{ ok: false, error, needed, provided }` into an error a human
 * can act on. The scopes also ride along in `extensions` so the portal and the
 * log pipeline see them as data, not only as prose.
 */
function slackFailure(method: string, data: any, status: number): GraphQLError {
  const error = String(data.error ?? '') || `HTTP ${status}`;
  const extensions: Record<string, unknown> = {
    code: 'BAD_GATEWAY',
    slack_method: method,
    slack_error: error,
  };
  const needed = parseScopes(data.needed);
  const provided = parseScopes(data.provided);
  if (needed.length > 0) extensions.slack_needed = needed;
  if (provided.length > 0) extensions.slack_provided = provided;
  return new GraphQLError(slackFailureMessage(method, error, data), { extensions });
}

async function botToken(): Promise<string> {
  const token = await getRuntimeEnvValue('SLACK_BOT_TOKEN');
  if (!token) {
    throw new GraphQLError('Slack is not configured. Add the bot token in the Tech portal.', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  return token;
}

export async function isSlackConfigured(): Promise<boolean> {
  return !!(await getRuntimeEnvValue('SLACK_BOT_TOKEN'));
}

async function slackCall(
  method: string,
  query: string,
  init: RequestInit,
  token: string
): Promise<any> {
  const res = await fetch(`${SLACK_API}/${method}${query}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  const data: any = await res.json().catch(() => ({}));
  // Slack answers HTTP 200 even when it refuses, so `ok` is the only signal —
  // never fall through, or a refused call reads as an empty result.
  if (!data.ok) throw slackFailure(method, data, res.status);
  return data;
}

async function slackGet(method: string, params: Record<string, string>): Promise<any> {
  const token = await botToken();
  const qs = new URLSearchParams(params).toString();
  return slackCall(method, qs ? `?${qs}` : '', { method: 'GET' }, token);
}

async function slackPost(method: string, body: Record<string, unknown>): Promise<any> {
  const token = await botToken();
  return slackCall(
    method,
    '',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    },
    token
  );
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  num_members: number;
  topic: string;
}

const toChannel = (c: any): SlackChannel => ({
  id: String(c.id ?? ''),
  name: String(c.name ?? ''),
  is_private: !!c.is_private,
  is_member: !!c.is_member,
  num_members: Number(c.num_members ?? 0),
  topic: String(c.topic?.value ?? ''),
});

/** Slack allows up to 1000 per page but recommends no more than 200; larger
 * pages time out on big workspaces. The page cap is a runaway guard. */
const CHANNEL_PAGE_SIZE = '200';
const MAX_CHANNEL_PAGES = 25;

/**
 * Every public + private channel the bot can see, following Slack's cursor
 * pagination — one page silently dropped the rest of a large workspace.
 * Needs `channels:read` + `groups:read` on the bot token.
 */
export async function listChannels(): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = [];
  let cursor = '';
  for (let page = 0; page < MAX_CHANNEL_PAGES; page += 1) {
    const params: Record<string, string> = {
      types: 'public_channel,private_channel',
      exclude_archived: 'true',
      limit: CHANNEL_PAGE_SIZE,
    };
    if (cursor) params.cursor = cursor;
    const data = await slackGet('conversations.list', params);
    channels.push(...(data.channels ?? []).map(toChannel));
    cursor = String(data.response_metadata?.next_cursor ?? '');
    if (!cursor) break;
  }
  return channels;
}

export interface SlackUser {
  id: string;
  name: string;
  avatar: string;
  is_bot: boolean;
}

/**
 * Directory cache. Every message in a channel names its author by id, so
 * rendering one screenful would otherwise be one users.info call per distinct
 * author, repeated on every poll. One users.list covers the workspace, and it
 * changes on the timescale of people joining a company.
 */
const USER_CACHE_MS = 10 * 60 * 1000;
let userCache: { at: number; users: Map<string, SlackUser> } | null = null;

const USER_PAGE_SIZE = '200';
const MAX_USER_PAGES = 25;

/** Everyone in the workspace, by id. Needs `users:read`. */
export async function listUsers(): Promise<Map<string, SlackUser>> {
  if (userCache && Date.now() - userCache.at < USER_CACHE_MS) return userCache.users;
  const users = new Map<string, SlackUser>();
  let cursor = '';
  for (let page = 0; page < MAX_USER_PAGES; page += 1) {
    const params: Record<string, string> = { limit: USER_PAGE_SIZE };
    if (cursor) params.cursor = cursor;
    const data = await slackGet('users.list', params);
    for (const m of data.members ?? []) {
      const id = String(m.id ?? '');
      if (!id) continue;
      users.set(id, {
        id,
        // real_name is what people recognise; `name` is the handle, which is
        // all a bot or a stripped-down profile has.
        name: String(m.profile?.real_name || m.real_name || m.name || id),
        avatar: String(m.profile?.image_48 ?? ''),
        is_bot: !!m.is_bot,
      });
    }
    cursor = String(data.response_metadata?.next_cursor ?? '');
    if (!cursor) break;
  }
  userCache = { at: Date.now(), users };
  return users;
}

export interface SlackMessage {
  ts: string;
  user_id: string;
  user_name: string;
  avatar: string;
  text: string;
  is_bot: boolean;
  /** Replies hanging off this message; the pane says so rather than hiding them. */
  reply_count: number;
}

/** Slack caps conversations.history at 1000; a chat pane wants the recent tail. */
const MAX_HISTORY = 200;

/**
 * The recent messages of one channel, OLDEST FIRST.
 *
 * Slack returns newest-first because it pages backwards through time; a chat
 * pane reads the other way, so the reversal happens here rather than in each
 * client. Needs `channels:history` / `groups:history`, and the bot must be a
 * member of the channel — Slack refuses history for a channel it is not in.
 */
export async function channelHistory(channel: string, limit: number): Promise<SlackMessage[]> {
  const capped = Math.min(Math.max(limit, 1), MAX_HISTORY);
  const data = await slackGet('conversations.history', {
    channel,
    limit: String(capped),
  });
  const users = await listUsers();
  const messages: SlackMessage[] = (data.messages ?? []).map((m: any) => {
    const userId = String(m.user ?? m.bot_id ?? '');
    const known = users.get(userId);
    // A bot post carries its display name inline and is usually absent from the
    // user directory, so its own username is the only name it has.
    const botName = String(m.username ?? m.bot_profile?.name ?? '');
    return {
      ts: String(m.ts ?? ''),
      user_id: userId,
      user_name: known?.name || botName || userId,
      avatar: known?.avatar || String(m.bot_profile?.icons?.image_48 ?? ''),
      text: String(m.text ?? ''),
      is_bot: known?.is_bot ?? Boolean(m.bot_id),
      reply_count: Number(m.reply_count ?? 0),
    };
  });
  return messages.reverse();
}

export interface SlackTeam {
  id: string;
  name: string;
  domain: string;
  url: string;
}

/** Workspace info — used to build shareable channel archive links. Needs
 * `team:read`; without it the channel list fails too, since the links come
 * from here. */
export async function teamInfo(): Promise<SlackTeam> {
  const data = await slackGet('team.info', {});
  const t = data.team ?? {};
  return {
    id: String(t.id ?? ''),
    name: String(t.name ?? ''),
    domain: String(t.domain ?? ''),
    url: String(t.url ?? (t.domain ? `https://${t.domain}.slack.com` : '')),
  };
}

/** All chat.postMessage options we surface — supports the full Slack message
 * surface (blocks/attachments/threads/mrkdwn/unfurls/broadcast/identity). */
export interface PostMessageInput {
  channel: string;
  text?: string;
  blocks?: unknown[];
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

export interface PostMessageResult {
  channel: string;
  ts: string;
}

/** Post a message (needs `chat:write`). Drops undefined keys so Slack only
 * sees what was set. */
export async function postMessage(input: PostMessageInput): Promise<PostMessageResult> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) body[key] = value;
  }
  const data = await slackPost('chat.postMessage', body);
  return { channel: String(data.channel ?? ''), ts: String(data.ts ?? '') };
}
