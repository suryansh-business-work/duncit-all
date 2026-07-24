jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { slackService } from '../../slack.service';

const mockEnv = getRuntimeEnvValue as jest.Mock;

/** Route the Slack Web API by method name so a single fetch mock serves a whole
 * flow (team.info + conversations.list + chat.postMessage). */
const routeFetch = (byMethod: Record<string, any>) =>
  jest.fn().mockImplementation((url: string) => {
    const method = Object.keys(byMethod).find((m) => url.includes(m));
    return Promise.resolve({ ok: true, status: 200, json: async () => byMethod[method ?? ''] ?? { ok: true } });
  });

const withToken = (extra?: (k: string) => string) =>
  mockEnv.mockImplementation(async (k: string) => (extra ? extra(k) : k === 'SLACK_BOT_TOKEN' ? 'xoxb-1' : ''));

beforeEach(() => {
  mockEnv.mockReset();
});
afterEach(() => {
  delete (global as any).fetch;
});

describe('slackService.configured', () => {
  it('reflects whether a bot token is set', async () => {
    mockEnv.mockResolvedValue('xoxb-1');
    expect(await slackService.configured()).toBe(true);
    mockEnv.mockResolvedValue('');
    expect(await slackService.configured()).toBe(false);
  });
});

describe('slackService.channels', () => {
  it('maps channels with archive links (team url wins) + field defaults', async () => {
    withToken();
    (global as any).fetch = routeFetch({
      'team.info': { ok: true, team: { id: 'T1', name: 'Duncit', domain: 'duncit', url: 'https://d.slack.com/' } },
      'conversations.list': {
        ok: true,
        channels: [
          { id: 'C1', name: 'general', is_private: false, is_member: true, num_members: 5, topic: { value: 'hi' } },
          { id: 'C2' },
          {}, // no id at all
        ],
      },
    });
    const channels = await slackService.channels();
    expect(channels[0]).toMatchObject({ id: 'C1', topic: 'hi', link: 'https://d.slack.com/archives/C1' });
    // Missing fields default cleanly.
    expect(channels[1]).toMatchObject({ name: '', topic: '', num_members: 0, link: 'https://d.slack.com/archives/C2' });
    expect(channels[2].id).toBe('');
  });

  it('falls back to the domain, then to an empty link, and tolerates no channels', async () => {
    withToken();
    (global as any).fetch = routeFetch({
      'team.info': { ok: true, team: { domain: 'duncit' } },
      'conversations.list': { ok: true, channels: [{ id: 'C1' }] },
    });
    expect((await slackService.channels())[0].link).toBe('https://duncit.slack.com/archives/C1');

    // No `team` object at all → empty link (covers the team fallback).
    (global as any).fetch = routeFetch({
      'team.info': { ok: true },
      'conversations.list': { ok: true, channels: [{ id: 'C9' }] },
    });
    expect((await slackService.channels())[0].link).toBe('');

    // No `channels` key → [].
    (global as any).fetch = routeFetch({
      'team.info': { ok: true, team: { url: 'https://d.slack.com' } },
      'conversations.list': { ok: true },
    });
    expect(await slackService.channels()).toEqual([]);
  });

  it('throws when the bot token is missing', async () => {
    mockEnv.mockResolvedValue('');
    await expect(slackService.channels()).rejects.toThrow(/not configured/i);
  });
});

describe('slackService.send', () => {
  it('posts the full message surface and defaults the channel', async () => {
    withToken((k) => (k === 'SLACK_BOT_TOKEN' ? 'xoxb-1' : 'C_DEFAULT'));
    (global as any).fetch = routeFetch({
      'chat.postMessage': { ok: true, channel: 'C_DEFAULT', ts: '123.45' },
    });
    const res = await slackService.send({
      text: 'hi',
      blocks_json: '[{"type":"divider"}]',
      attachments_json: '[{"text":"a"}]',
      mrkdwn: true,
      unfurl_links: false,
      thread_ts: '100.1',
      icon_emoji: ':tada:',
    });
    expect(res).toEqual({ ok: true, channel: 'C_DEFAULT', ts: '123.45' });

    // A response missing channel/ts still resolves with empty strings.
    (global as any).fetch = routeFetch({ 'chat.postMessage': { ok: true } });
    expect(await slackService.send({ channel: 'C1', text: 'x' })).toEqual({ ok: true, channel: '', ts: '' });
  });

  it('rejects a missing channel, empty content, and malformed blocks/attachments', async () => {
    mockEnv.mockResolvedValue(''); // no channel + no default
    await expect(slackService.send({ text: 'hi' })).rejects.toThrow(/select a channel/i);
    withToken((k) => (k === 'SLACK_BOT_TOKEN' ? 'xoxb-1' : 'C1'));
    await expect(slackService.send({ channel: 'C1' })).rejects.toThrow(/text, blocks or attachments/i);
    await expect(slackService.send({ channel: 'C1', blocks_json: 'not-json' })).rejects.toThrow(/valid JSON/i);
    await expect(slackService.send({ channel: 'C1', attachments_json: '{"x":1}' })).rejects.toThrow(/JSON array/i);
  });

  it('surfaces a Slack API error (with and without an error string)', async () => {
    withToken();
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: false, error: 'channel_not_found' }) });
    await expect(slackService.send({ channel: 'CX', text: 'hi' })).rejects.toThrow(/channel_not_found/i);
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 500, json: async () => ({ ok: false }) });
    await expect(slackService.send({ channel: 'CX', text: 'hi' })).rejects.toThrow(/HTTP 500/i);
    // A non-JSON body → the response parse falls back to {}.
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json');
      },
    });
    await expect(slackService.send({ channel: 'CX', text: 'hi' })).rejects.toThrow(/HTTP 502/i);
  });
});

describe('slackService.sendFeedback', () => {
  const channelEnv = (fb: string, def: string) => (k: string) => {
    if (k === 'SLACK_BOT_TOKEN') return 'xoxb-1';
    if (k === 'SLACK_FEEDBACK_CHANNEL') return fb;
    if (k === 'SLACK_DEFAULT_CHANNEL') return def;
    return '';
  };

  it('posts to the feedback channel with the client blocks and stamps the token identity', async () => {
    withToken(channelEnv('C_FB', 'C_DEF'));
    let posted: any;
    (global as any).fetch = jest.fn().mockImplementation((_url: string, init: any) => {
      posted = JSON.parse(init.body);
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, channel: 'C_FB', ts: '9' }) });
    });
    const res = await slackService.sendFeedback(
      { id: 'u1', email: 'a@b.com' },
      { category: 'Bug', message: 'broken', platform: 'web', blocks_json: '[{"type":"divider"}]' },
    );
    expect(res).toEqual({ ok: true, channel: 'C_FB', ts: '9' });
    expect(posted.channel).toBe('C_FB');
    // Client body block kept, server appends a trusted identity context block.
    expect(posted.blocks[0]).toEqual({ type: 'divider' });
    expect(posted.blocks[1].elements[0].text).toBe('Bug · by a@b.com · web');
  });

  it('falls back to the default channel, the user id and a section body', async () => {
    withToken(channelEnv('', 'C_DEF'));
    let posted: any;
    (global as any).fetch = jest.fn().mockImplementation((_url: string, init: any) => {
      posted = JSON.parse(init.body);
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, channel: 'C_DEF', ts: '1' }) });
    });
    const res = await slackService.sendFeedback({ id: 'u2' }, { category: 'Idea', message: 'nice' });
    expect(res.channel).toBe('C_DEF');
    expect(posted.channel).toBe('C_DEF');
    expect(posted.blocks[0]).toEqual({ type: 'section', text: { type: 'mrkdwn', text: 'nice' } });
    expect(posted.blocks[1].elements[0].text).toBe('Idea · by u2 · app');
  });

  it('requires both a category and a message', async () => {
    await expect(slackService.sendFeedback({ id: 'u1' }, { message: 'x' })).rejects.toThrow(/required/i);
    await expect(slackService.sendFeedback({ id: 'u1' }, { category: 'Bug' })).rejects.toThrow(/required/i);
  });

  it('rejects when no feedback or default channel is configured', async () => {
    withToken(channelEnv('', ''));
    await expect(
      slackService.sendFeedback({ id: 'u1' }, { category: 'Bug', message: 'x' }),
    ).rejects.toThrow(/no slack channel/i);
  });
});
