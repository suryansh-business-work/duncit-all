import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

/**
 * Slack gateway — thin Web API wrapper. The bot token is owned by the Tech
 * portal (SLACK env category), never `.env`, read fresh via
 * {@link getRuntimeEnvValue}. No SDK — every call is a single REST request.
 * Slack always replies HTTP 200; the JSON body's `ok` flag decides success.
 */
const SLACK_API = 'https://slack.com/api';

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

async function slackCall(method: string, init: RequestInit, token: string): Promise<any> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new GraphQLError(`Slack error: ${data.error ?? `HTTP ${res.status}`}`, {
      extensions: { code: 'BAD_GATEWAY' },
    });
  }
  return data;
}

async function slackGet(method: string, params: Record<string, string>): Promise<any> {
  const token = await botToken();
  const qs = new URLSearchParams(params).toString();
  return slackCall(`${method}?${qs}`, { method: 'GET' }, token);
}

async function slackPost(method: string, body: Record<string, unknown>): Promise<any> {
  const token = await botToken();
  return slackCall(
    method,
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

/** Public + private channels the bot can see (paginated to a single 1000 page). */
export async function listChannels(): Promise<SlackChannel[]> {
  const data = await slackGet('conversations.list', {
    types: 'public_channel,private_channel',
    exclude_archived: 'true',
    limit: '1000',
  });
  return (data.channels ?? []).map((c: any) => ({
    id: String(c.id ?? ''),
    name: String(c.name ?? ''),
    is_private: !!c.is_private,
    is_member: !!c.is_member,
    num_members: Number(c.num_members ?? 0),
    topic: String(c.topic?.value ?? ''),
  }));
}

export interface SlackTeam {
  id: string;
  name: string;
  domain: string;
  url: string;
}

/** Workspace info — used to build shareable channel archive links. */
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

/** Post a message. Drops undefined keys so Slack only sees what was set. */
export async function postMessage(input: PostMessageInput): Promise<PostMessageResult> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) body[key] = value;
  }
  const data = await slackPost('chat.postMessage', body);
  return { channel: String(data.channel ?? ''), ts: String(data.ts ?? '') };
}
