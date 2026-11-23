import type { ResolvedEntry } from '../intel.credentials';
import type { ConnectorDriver, SyncContext, TestResult } from '../intel.driver';
import { fetchJson, ProviderError } from '../intel.http';

/**
 * Slack: the bot token from the chosen Tech portal SLACK entry reads the
 * selected channels. A thread is one document (root + replies); messages
 * outside threads are grouped per channel per day. Incremental syncs read only
 * messages newer than the last one seen in each channel.
 *
 * Needs the scopes channels:history, groups:history, channels:read,
 * groups:read and users:read on the Slack app.
 */

const API = 'https://slack.com/api';

interface SlackMessage {
  ts: string;
  user?: string;
  text?: string;
  thread_ts?: string;
  reply_count?: number;
  subtype?: string;
  files?: Array<{ name?: string; title?: string; preview?: string }>;
}

async function slack<T>(entry: ResolvedEntry, method: string, params: Record<string, string> = {}): Promise<T> {
  const token = entry.config.bot_token ?? '';
  if (!token) throw new ProviderError(`The Tech portal entry "${entry.name}" has no bot token.`, 0);
  const qs = new URLSearchParams(params).toString();
  const body = await fetchJson<{ ok: boolean; error?: string } & T>(`${API}/${method}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!body.ok) throw new ProviderError(`Slack ${method}: ${body.error ?? 'failed'}`, 400);
  return body;
}

export async function listChannels(entry: ResolvedEntry): Promise<Array<{ id: string; name: string; is_private: boolean }>> {
  const out: Array<{ id: string; name: string; is_private: boolean }> = [];
  let cursor = '';
  do {
    const page = await slack<{ channels: Array<{ id: string; name: string; is_private: boolean }>; response_metadata?: { next_cursor?: string } }>(entry, 'conversations.list', {
      types: 'public_channel,private_channel',
      exclude_archived: 'true',
      limit: '200',
      ...(cursor ? { cursor } : {}),
    });
    out.push(...page.channels.map((c) => ({ id: c.id, name: c.name, is_private: c.is_private })));
    cursor = page.response_metadata?.next_cursor ?? '';
  } while (cursor && out.length < 2000);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function userNamer(entry: ResolvedEntry) {
  const cache = new Map<string, string>();
  return async (id?: string): Promise<string> => {
    if (!id) return 'someone';
    if (!cache.has(id)) {
      const info = await slack<{ user?: { real_name?: string; name?: string } }>(entry, 'users.info', { user: id }).catch(() => ({ user: undefined }));
      cache.set(id, info.user?.real_name || info.user?.name || id);
    }
    return cache.get(id) ?? id;
  };
}

const permalink = (teamUrl: string, channel: string, ts: string) => `${teamUrl.replace(/\/$/, '')}/archives/${channel}/p${ts.replace('.', '')}`;
const dayOf = (ts: string) => new Date(Number(ts) * 1000).toISOString().slice(0, 10);

const fileLine = (f: { name?: string; title?: string; preview?: string }) => {
  const label = f.title ?? f.name ?? 'file';
  return f.preview ? label + ' — ' + f.preview.slice(0, 200) : label;
};

async function render(messages: SlackMessage[], name: (id?: string) => Promise<string>, withFiles: boolean): Promise<string> {
  const lines: string[] = [];
  for (const m of messages) {
    if (m.subtype && m.subtype !== 'thread_broadcast' && m.subtype !== 'file_share') continue;
    const files = withFiles && m.files?.length ? `\n  [files: ${m.files.map(fileLine).join('; ')}]` : '';
    lines.push(`[${new Date(Number(m.ts) * 1000).toISOString()}] ${await name(m.user)}: ${m.text ?? ''}${files}`);
  }
  return lines.join('\n');
}

async function history(entry: ResolvedEntry, channel: string, oldest: string): Promise<SlackMessage[]> {
  const out: SlackMessage[] = [];
  let cursor = '';
  do {
    const page = await slack<{ messages: SlackMessage[]; response_metadata?: { next_cursor?: string } }>(entry, 'conversations.history', { channel, oldest, limit: '200', ...(cursor ? { cursor } : {}) });
    out.push(...page.messages);
    cursor = page.response_metadata?.next_cursor ?? '';
  } while (cursor && out.length < 5000);
  return out.sort((a, b) => Number(a.ts) - Number(b.ts));
}

export const slackDriver: ConnectorDriver = {
  async test(_connector, entry): Promise<TestResult> {
    try {
      const auth = await slack<{ team?: string; url?: string; user?: string }>(entry, 'auth.test');
      return { ok: true, message: `Connected to ${auth.team ?? 'Slack'} as ${auth.user ?? 'the bot'}.`, details: [auth.url ?? ''] };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Connection failed', details: [] };
    }
  },

  async sync(ctx: SyncContext) {
    const { entry, connector } = ctx;
    const auth = await slack<{ url?: string }>(entry, 'auth.test');
    const teamUrl = auth.url ?? 'https://slack.com';
    const name = userNamer(entry);
    const cfg = connector.config as { channels?: Array<{ id: string; name: string }>; include_threads?: boolean; index_attachments?: boolean; history_days?: number };
    const floor = String(Math.floor(Date.now() / 1000) - (cfg.history_days ?? 90) * 86_400);
    const positions = (ctx.cursor.channels as Record<string, string> | undefined) ?? {};
    for (const channel of cfg.channels ?? []) {
      // Incremental runs re-read from the start of the last seen day, so a day
      // document is always rebuilt whole rather than replaced by its newest messages.
      const seen = positions[channel.id];
      const oldest = ctx.mode === 'INCREMENTAL' && seen ? String(Date.parse(`${dayOf(seen)}T00:00:00Z`) / 1000) : floor;
      const messages = await history(entry, channel.id, oldest);
      const days = new Map<string, SlackMessage[]>();
      for (const m of messages) {
        if (cfg.include_threads !== false && (m.reply_count ?? 0) > 0) {
          const replies = await slack<{ messages: SlackMessage[] }>(entry, 'conversations.replies', { channel: channel.id, ts: m.ts, limit: '200' });
          const text = await render(replies.messages, name, Boolean(cfg.index_attachments));
          const ok = await ctx.emit({ external_id: `${channel.id}:thread:${m.ts}`, title: `#${channel.name} · thread ${dayOf(m.ts)}: ${(m.text ?? '').slice(0, 60)}`, url: permalink(teamUrl, channel.id, m.ts), text, metadata: { channel: channel.name, thread_ts: m.ts }, updated_at: new Date(Number(m.ts) * 1000) });
          if (!ok) return;
        } else if (!m.thread_ts || m.thread_ts === m.ts) {
          const list = days.get(dayOf(m.ts)) ?? [];
          list.push(m);
          days.set(dayOf(m.ts), list);
        }
      }
      for (const [day, list] of days) {
        const first = list[0];
        const ok = await ctx.emit({ external_id: `${channel.id}:day:${day}`, title: `#${channel.name} · ${day}`, url: first ? permalink(teamUrl, channel.id, first.ts) : teamUrl, text: await render(list, name, Boolean(cfg.index_attachments)), metadata: { channel: channel.name, day }, updated_at: new Date(`${day}T23:59:59Z`) });
        if (!ok) return;
      }
      const last = messages.at(-1);
      if (last) positions[channel.id] = last.ts;
      ctx.log(`#${channel.name}: ${messages.length} message(s) read`);
    }
    ctx.cursor.channels = positions;
  },
};
