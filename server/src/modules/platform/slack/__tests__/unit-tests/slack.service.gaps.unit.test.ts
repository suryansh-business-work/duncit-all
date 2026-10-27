/**
 * The Slack service paths its main suite leaves out, with Slack itself faked at
 * `fetch`: reading a channel, what the bot may do, joining a channel (and why a
 * private one is refused here), and announcing a saved problem report.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } } }));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import * as gateway from '../../slack.gateway';
import { SLACK_BOT_SCOPES, SLACK_OPTIONAL_SCOPES } from '../../slack.gateway';
import { slackService } from '../../slack.service';

const mockEnv = getRuntimeEnvValue as jest.Mock;
const respond = (body: unknown, headers: Record<string, string> = {}) => ({
  ok: true,
  status: 200,
  headers: { get: (name: string) => headers[name] ?? null },
  json: async () => body,
});

/** Slack's Web API by method name, one answer per method. */
const slack = (byMethod: Record<string, unknown>, headers: Record<string, string> = {}) => {
  const fn = jest.fn().mockImplementation(async (url: string) => {
    const method = Object.keys(byMethod).find((m) => url.includes(m));
    return respond(byMethod[method ?? ''] ?? { ok: true }, headers);
  });
  (global as any).fetch = fn;
  return fn;
};

const bodyOf = (fn: jest.Mock, method: string) => {
  const call = fn.mock.calls.find(([url]: [string]) => url.includes(method));
  return JSON.parse(call[1].body);
};

beforeEach(() => {
  mockEnv.mockReset();
  mockEnv.mockImplementation(async (key: string) => (key === 'SLACK_BOT_TOKEN' ? 'xoxb-1' : ''));
});
afterEach(() => {
  delete (global as any).fetch;
});

describe('every scope the gateway reports has a purpose to show', () => {
  it('names why each required and optional scope is needed', async () => {
    slack({ 'auth.test': { ok: true, team: 'Duncit' } }, { 'x-oauth-scopes': 'chat:write' });
    const status = (await slackService.permissions()) as { scopes: Array<{ scope: string; purpose: string }> };
    expect(status.scopes.map((s) => s.scope)).toEqual([...SLACK_BOT_SCOPES, ...SLACK_OPTIONAL_SCOPES]);
    expect(status.scopes.every((s) => s.purpose.length > 10)).toBe(true);
  });
});

describe('history', () => {
  it('refuses a blank channel', () => {
    expect(() => slackService.history('  ')).toThrow('Select a channel to read');
    expect(() => slackService.history(undefined as never)).toThrow('Select a channel to read');
  });

  it('reads fifty messages by default and the number asked for otherwise, oldest first', async () => {
    const fn = slack({
      'conversations.history': { ok: true, messages: [{ ts: '2', user: 'U1', text: 'later' }, { ts: '1', user: 'U1', text: 'earlier' }] },
      'users.list': { ok: true, members: [{ id: 'U1', name: 'asha', profile: { display_name: 'Asha' } }] },
    });
    const messages = await slackService.history('C1');
    expect(messages.map((m) => m.text)).toEqual(['earlier', 'later']);
    expect(fn.mock.calls.find(([url]: [string]) => url.includes('conversations.history'))[0]).toContain('limit=50');
    await slackService.history('C1', 10);
    expect(fn.mock.calls.filter(([url]: [string]) => url.includes('conversations.history')).at(-1)[0]).toContain('limit=10');
  });
});

describe('permissions', () => {
  it('reports an unconfigured workspace without asking Slack anything', async () => {
    mockEnv.mockResolvedValue('');
    const fn = slack({});
    await expect(slackService.permissions()).resolves.toMatchObject({ configured: false, team: '', scopes_known: false, scopes: [], error: '', app_url: expect.any(String), docs_url: expect.any(String) });
    expect(fn).not.toHaveBeenCalled();
  });

  it('reports the team and which scopes are held', async () => {
    slack({ 'auth.test': { ok: true, team: 'Duncit' } }, { 'x-oauth-scopes': 'chat:write,channels:read' });
    const out = (await slackService.permissions()) as any;
    expect(out).toMatchObject({ configured: true, error: '', team: 'Duncit', scopes_known: true });
    expect(out.scopes.find((s: any) => s.scope === 'chat:write')).toMatchObject({ granted: true, required: true });
    expect(out.scopes.find((s: any) => s.scope === 'files:write')).toMatchObject({ granted: false, required: false });
  });

  it('answers with the failure instead of throwing when Slack refuses the check or cannot be reached', async () => {
    slack({ 'auth.test': { ok: false, error: 'invalid_auth' } });
    await expect(slackService.permissions()).resolves.toMatchObject({ configured: true, team: '', scopes: [], error: expect.stringContaining('invalid_auth') });
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
    await expect(slackService.permissions()).resolves.toMatchObject({ configured: true, error: expect.stringContaining('network down') });
  });

  it('reads an answer that is not JSON as a refusal carrying its status', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: { get: () => null },
      json: async () => {
        throw new Error('<html>');
      },
    });
    await expect(slackService.permissions()).resolves.toMatchObject({ configured: true, error: expect.stringContaining('502') });
  });

  it('still answers when something other than an Error escapes the gateway, so the panel is never left blank', async () => {
    jest.spyOn(gateway, 'authStatus').mockRejectedValueOnce('plain failure');
    await expect(slackService.permissions()).resolves.toMatchObject({ configured: true, team: '', error: 'plain failure' });
  });
});

describe('join', () => {
  it('refuses a blank channel', async () => {
    await expect(slackService.join('  ')).rejects.toMatchObject({ message: 'Select a channel to join', extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('refuses a private channel here, naming it and saying what to do instead', async () => {
    const fn = slack({ 'conversations.list': { ok: true, channels: [{ id: 'C9', name: 'leads', is_private: true }] } });
    await expect(slackService.join('C9')).rejects.toMatchObject({ message: expect.stringContaining('#leads is private') });
    expect(fn.mock.calls.some(([url]: [string]) => url.includes('conversations.join'))).toBe(false);
  });

  it('joins a public channel, answers that the bot is a member, and links to it', async () => {
    const fn = slack({
      'conversations.list': { ok: true, channels: [{ id: 'C1', name: 'general', is_private: false }] },
      'conversations.join': { ok: true, channel: { id: 'C1', name: 'general', is_member: false } },
      'team.info': { ok: true, team: { id: 'T1', url: 'https://d.slack.com/' } },
    });
    await expect(slackService.join(' C1 ')).resolves.toMatchObject({ id: 'C1', is_member: true, link: 'https://d.slack.com/archives/C1' });
    expect(bodyOf(fn, 'conversations.join')).toEqual({ channel: 'C1' });
  });

  it('joins a channel the listing does not know, rather than refusing it', async () => {
    slack({
      'conversations.list': { ok: true, channels: [] },
      'conversations.join': { ok: true, channel: { id: 'C7', name: 'new' } },
      'team.info': { ok: true, team: { id: 'T1', domain: 'duncit' } },
    });
    await expect(slackService.join('C7')).resolves.toMatchObject({ id: 'C7', is_member: true, link: 'https://duncit.slack.com/archives/C7' });
  });
});

describe('announceFeedback', () => {
  const report = { report_no: 'DUN-RPT-000001', category: 'BUG', message: 'The pods page is blank', who: 'asha@example.com', platform: 'mweb' };
  const channels = (feedback: string, fallback: string) => (key: string) =>
    key === 'SLACK_BOT_TOKEN' ? 'xoxb-1' : key === 'SLACK_FEEDBACK_CHANNEL' ? feedback : key === 'SLACK_DEFAULT_CHANNEL' ? fallback : '';

  it('posts to the channel Support picked, ahead of the environment’s', async () => {
    mockEnv.mockImplementation(async (key: string) => channels('C_ENV_FB', 'C_ENV_DEF')(key));
    const fn = slack({ 'chat.postMessage': { ok: true, channel: 'C_PICKED', ts: '1.1' } });
    await expect(slackService.announceFeedback({ ...report, channel: ' C_PICKED ' })).resolves.toEqual({ ts: '1.1' });
    const body = bodyOf(fn, 'chat.postMessage');
    expect(body.channel).toBe('C_PICKED');
    expect(body.text).toBe('DUN-RPT-000001 · BUG from asha@example.com: The pods page is blank');
    expect(body.blocks[0]).toEqual({ type: 'section', text: { type: 'mrkdwn', text: 'The pods page is blank' } });
    expect(body.blocks.at(-1).elements[0].text).toBe('DUN-RPT-000001 · BUG · by asha@example.com · mweb');
    expect(JSON.stringify(body.blocks)).not.toContain('screenshot');
  });

  it('falls back to the feedback channel, then the default one, and says so when there is none', async () => {
    mockEnv.mockImplementation(async (key: string) => channels('C_ENV_FB', 'C_ENV_DEF')(key));
    const fn = slack({ 'chat.postMessage': { ok: true, channel: 'x', ts: '2' } });
    await slackService.announceFeedback({ ...report, channel: null });
    expect(bodyOf(fn, 'chat.postMessage').channel).toBe('C_ENV_FB');
    mockEnv.mockImplementation(async (key: string) => channels('  ', 'C_ENV_DEF')(key));
    await slackService.announceFeedback(report);
    expect(fn.mock.calls.filter(([url]: [string]) => url.includes('chat.postMessage')).at(-1)[1].body).toContain('C_ENV_DEF');
    mockEnv.mockImplementation(async (key: string) => channels('', '')(key));
    await expect(slackService.announceFeedback(report)).resolves.toEqual({ skipped: 'No Slack channel is configured for feedback' });
  });

  it('uses the blocks it was given, and lists the screenshots it has', async () => {
    mockEnv.mockImplementation(async (key: string) => channels('C1', '')(key));
    const fn = slack({ 'chat.postMessage': { ok: true, channel: 'C1', ts: '3' } });
    await slackService.announceFeedback({
      ...report, blocks_json: JSON.stringify([{ type: 'header', text: { type: 'plain_text', text: 'Custom' } }]), media_urls: ['https://i/1.png', '', 'https://i/2.png'],
    });
    const blocks = bodyOf(fn, 'chat.postMessage').blocks;
    expect(blocks[0].type).toBe('header');
    expect(blocks[1].elements[0].text).toBe('<https://i/1.png|screenshot> · <https://i/2.png|screenshot>');
    expect(blocks).toHaveLength(3);
  });

  it('refuses blocks that are not a JSON array', async () => {
    mockEnv.mockImplementation(async (key: string) => channels('C1', '')(key));
    slack({});
    await expect(slackService.announceFeedback({ ...report, blocks_json: '{"a":1}' })).rejects.toMatchObject({ message: 'Feedback must be a JSON array' });
    await expect(slackService.announceFeedback({ ...report, blocks_json: 'nope' })).rejects.toMatchObject({ message: 'Feedback must be valid JSON' });
  });
});
