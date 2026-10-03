jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';
import {
  SLACK_BOT_SCOPES,
  SLACK_FILES_PER_MESSAGE,
  SLACK_OPTIONAL_SCOPES,
  authStatus,
  channelHistory,
  completeFileUpload,
  deleteFile,
  ensureChannelMember,
  getFileUploadUrl,
  isSlackConfigured,
  joinChannel,
  listChannels,
  listUsers,
  missingBotScopes,
  postMessage,
  teamInfo,
} from '../../slack.gateway';

const mockEnv = getRuntimeEnvValue as jest.Mock;
const mockFetch = outboundFetch as jest.Mock;

/** A fetch Response stand-in: Slack always answers 200, the body decides. */
const reply = (body: unknown, opts: { status?: number; scopes?: string | null; badJson?: boolean } = {}) => ({
  status: opts.status ?? 200,
  json: opts.badJson ? async () => Promise.reject(new Error('not json')) : async () => body,
  headers: { get: (name: string) => (name === 'x-oauth-scopes' ? (opts.scopes ?? null) : null) },
});

/** Queue the replies of consecutive Slack calls. */
const queue = (...bodies: unknown[]) => {
  for (const body of bodies) mockFetch.mockResolvedValueOnce(reply(body));
};

const urlOf = (call: number): string => mockFetch.mock.calls[call][1];
const initOf = (call: number): any => mockFetch.mock.calls[call][2];

// listUsers keeps a 10-minute module cache; each test moves the clock an hour
// on so no test ever reads a directory another one loaded.
let clock = Date.UTC(2026, 0, 1);
beforeEach(() => {
  clock += 60 * 60 * 1000;
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
  mockEnv.mockReset();
  mockFetch.mockReset();
  mockEnv.mockResolvedValue('xoxb-test');
});
afterEach(() => jest.restoreAllMocks());

const caught = async (p: Promise<unknown>): Promise<GraphQLError> => {
  try {
    await p;
  } catch (err) {
    return err as GraphQLError;
  }
  throw new Error('expected a rejection');
};

describe('scope bookkeeping', () => {
  it('keeps optional scopes out of the required set', () => {
    expect(SLACK_BOT_SCOPES).toEqual(
      expect.arrayContaining(['channels:read', 'groups:read', 'team:read', 'chat:write', 'users:read'])
    );
    for (const optional of SLACK_OPTIONAL_SCOPES) expect(SLACK_BOT_SCOPES).not.toContain(optional);
    expect(new Set(SLACK_BOT_SCOPES).size).toBe(SLACK_BOT_SCOPES.length);
  });

  it('lists exactly the required scopes a token lacks, tolerating stray spaces', () => {
    const allButTwo = SLACK_BOT_SCOPES.filter((s) => s !== 'team:read' && s !== 'users:read');
    expect(missingBotScopes(` ${allButTwo.join(' , ')} ,`)).toEqual(['team:read', 'users:read']);
    expect(missingBotScopes(SLACK_BOT_SCOPES.join(','))).toEqual([]);
    expect(missingBotScopes('')).toEqual(SLACK_BOT_SCOPES);
  });
});

describe('token handling', () => {
  it('reports whether a bot token is configured', async () => {
    expect(await isSlackConfigured()).toBe(true);
    mockEnv.mockResolvedValue('');
    expect(await isSlackConfigured()).toBe(false);
  });

  it('refuses every call with BAD_REQUEST when the token is missing, without touching the network', async () => {
    mockEnv.mockResolvedValue(undefined);
    const err = await caught(teamInfo());
    expect(err.message).toMatch(/Slack is not configured/);
    expect(err.extensions.code).toBe('BAD_REQUEST');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends the bearer token and merges caller headers on POST', async () => {
    queue({ ok: true, channel: 'C1', ts: '1.2' });
    await postMessage({ channel: 'C1', text: 'hi' });
    expect(mockFetch.mock.calls[0][0]).toBe('Slack');
    expect(urlOf(0)).toBe('https://slack.com/api/chat.postMessage');
    expect(initOf(0).headers).toEqual({
      Authorization: 'Bearer xoxb-test',
      'Content-Type': 'application/json; charset=utf-8',
    });
  });
});

describe('Slack failures', () => {
  it('names the scope Slack asked for and what the token has', async () => {
    queue({ ok: false, error: 'missing_scope', needed: 'team:read', provided: 'chat:write, users:read' });
    const err = await caught(teamInfo());
    expect(err.message).toContain('Slack rejected team.info: missing_scope');
    expect(err.message).toContain('needs the scope team:read');
    expect(err.message).toContain('The token currently has: chat:write, users:read.');
    expect(err.extensions).toEqual({
      code: 'BAD_GATEWAY',
      slack_method: 'team.info',
      slack_error: 'missing_scope',
      slack_needed: ['team:read'],
      slack_provided: ['chat:write', 'users:read'],
    });
  });

  it('falls back to the documented scopes when Slack omits `needed`, and to none for an unknown method', async () => {
    queue({ ok: false, error: 'missing_scope' });
    const err = await caught(listChannels());
    expect(err.message).toContain('needs the scope channels:read, groups:read.');
    expect(err.message).not.toContain('currently has');
    expect(err.extensions.slack_needed).toBeUndefined();
    expect(err.extensions.slack_provided).toBeUndefined();

    // auth.test is not in the required-scope map → empty scope list.
    mockFetch.mockResolvedValueOnce(reply({ ok: false, error: 'missing_scope' }));
    const authErr = await caught(authStatus());
    expect(authErr.message).toContain('Slack rejected auth.test: missing_scope — the bot token needs the scope .');
  });

  it.each(['invalid_auth', 'not_authed', 'account_inactive', 'token_revoked', 'token_expired'])(
    'tells the admin to reinstall on a dead token (%s)',
    async (error) => {
      queue({ ok: false, error });
      const err = await caught(teamInfo());
      expect(err.message).toBe(
        `Slack rejected team.info: ${error} — the bot token is no longer valid. Reinstall the Slack app and paste the new xoxb- token into Environment Variables -> Slack.`
      );
    }
  );

  it('passes any other Slack error through verbatim', async () => {
    queue({ ok: false, error: 'channel_not_found' });
    const err = await caught(channelHistory('C404', 10));
    expect(err.message).toBe('Slack rejected conversations.history: channel_not_found.');
  });

  it('uses the HTTP status when the body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce(reply(null, { status: 502, badJson: true }));
    const err = await caught(teamInfo());
    expect(err.message).toBe('Slack rejected team.info: HTTP 502.');
    expect(err.extensions.slack_error).toBe('HTTP 502');
  });
});

describe('listChannels', () => {
  it('follows the cursor across pages and normalises each channel', async () => {
    queue(
      {
        ok: true,
        channels: [{ id: 'C1', name: 'general', is_private: 0, is_member: 1, num_members: 4, topic: { value: 'hi' } }],
        response_metadata: { next_cursor: 'abc' },
      },
      { ok: true, channels: [{}], response_metadata: { next_cursor: '' } }
    );
    const channels = await listChannels();
    expect(channels).toEqual([
      { id: 'C1', name: 'general', is_private: false, is_member: true, num_members: 4, topic: 'hi' },
      { id: '', name: '', is_private: false, is_member: false, num_members: 0, topic: '' },
    ]);
    expect(urlOf(0)).toContain('types=public_channel%2Cprivate_channel');
    expect(urlOf(0)).not.toContain('cursor=');
    expect(urlOf(1)).toContain('cursor=abc');
  });

  it('stops after the page cap even if Slack keeps returning a cursor', async () => {
    mockFetch.mockImplementation(async () =>
      reply({ ok: true, channels: [{ id: 'C' }], response_metadata: { next_cursor: 'more' } })
    );
    const channels = await listChannels();
    expect(mockFetch).toHaveBeenCalledTimes(25);
    expect(channels).toHaveLength(25);
  });

  it('treats a page with no channels key as empty', async () => {
    queue({ ok: true });
    expect(await listChannels()).toEqual([]);
  });
});

describe('listUsers', () => {
  it('builds the directory with the best available name and skips id-less members', async () => {
    queue(
      {
        ok: true,
        members: [
          { id: 'U1', profile: { real_name: 'Asha', image_48: 'a.png' } },
          { id: 'U2', real_name: 'Bilal' },
          { id: 'U3', name: 'cee', is_bot: true },
          { id: 'U4' },
          { name: 'ghost' },
        ],
        response_metadata: { next_cursor: 'p2' },
      },
      { ok: true }
    );
    const users = await listUsers();
    expect([...users.keys()]).toEqual(['U1', 'U2', 'U3', 'U4']);
    expect(users.get('U1')).toEqual({ id: 'U1', name: 'Asha', avatar: 'a.png', is_bot: false });
    expect(users.get('U2')?.name).toBe('Bilal');
    expect(users.get('U3')).toEqual({ id: 'U3', name: 'cee', avatar: '', is_bot: true });
    expect(users.get('U4')?.name).toBe('U4');
    expect(urlOf(1)).toContain('cursor=p2');
  });

  it('serves the cached directory for ten minutes, then refetches', async () => {
    queue({ ok: true, members: [{ id: 'U1', name: 'one' }] });
    const first = await listUsers();
    clock += 9 * 60 * 1000;
    expect(await listUsers()).toBe(first);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    clock += 2 * 60 * 1000;
    queue({ ok: true, members: [{ id: 'U2', name: 'two' }] });
    const second = await listUsers();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect([...second.keys()]).toEqual(['U2']);
  });
});

describe('channelHistory', () => {
  it('returns messages oldest first, naming humans from the directory and bots from the post', async () => {
    queue(
      {
        ok: true,
        messages: [
          { ts: '3', bot_id: 'B1', username: 'deploy-bot', text: 'shipped', bot_profile: { icons: { image_48: 'b.png' } } },
          { ts: '2', bot_id: 'B2', bot_profile: { name: 'ci' } },
          { ts: '1', user: 'U1', text: 'hello', reply_count: 3 },
          {},
        ],
      },
      { ok: true, members: [{ id: 'U1', profile: { real_name: 'Asha', image_48: 'a.png' } }] }
    );
    const messages = await channelHistory('C1', 50);
    expect(messages.map((m) => m.ts)).toEqual(['', '1', '2', '3']);
    expect(messages[1]).toEqual({
      ts: '1',
      user_id: 'U1',
      user_name: 'Asha',
      avatar: 'a.png',
      text: 'hello',
      is_bot: false,
      reply_count: 3,
    });
    expect(messages[2]).toMatchObject({ user_id: 'B2', user_name: 'ci', avatar: '', is_bot: true, text: '' });
    expect(messages[3]).toMatchObject({ user_name: 'deploy-bot', avatar: 'b.png', is_bot: true });
    expect(messages[0]).toMatchObject({ user_id: '', user_name: '', is_bot: false, reply_count: 0 });
  });

  it.each([
    [0, '1'],
    [-5, '1'],
    [10_000, '200'],
    [37, '37'],
  ])('clamps a limit of %p to %p', async (limit, sent) => {
    queue({ ok: true }, { ok: true, members: [] });
    expect(await channelHistory('C1', limit)).toEqual([]);
    expect(urlOf(0)).toContain(`limit=${sent}`);
  });
});

describe('teamInfo', () => {
  it('maps the team and prefers its own url', async () => {
    queue({ ok: true, team: { id: 'T1', name: 'Duncit', domain: 'duncit', url: 'https://x.slack.com/' } });
    expect(await teamInfo()).toEqual({ id: 'T1', name: 'Duncit', domain: 'duncit', url: 'https://x.slack.com/' });
    expect(urlOf(0)).toBe('https://slack.com/api/team.info');
  });

  it('builds the url from the domain, or leaves it empty without one', async () => {
    queue({ ok: true, team: { domain: 'duncit' } }, { ok: true });
    expect((await teamInfo()).url).toBe('https://duncit.slack.com');
    expect(await teamInfo()).toEqual({ id: '', name: '', domain: '', url: '' });
  });
});

describe('postMessage', () => {
  it('drops undefined options and returns the posted coordinates', async () => {
    queue({ ok: true, channel: 'C1', ts: '99.1' });
    const result = await postMessage({ channel: 'C1', text: 'hi', thread_ts: undefined, mrkdwn: false });
    expect(result).toEqual({ channel: 'C1', ts: '99.1' });
    expect(JSON.parse(initOf(0).body)).toEqual({ channel: 'C1', text: 'hi', mrkdwn: false });
  });

  it('defaults missing coordinates to empty strings', async () => {
    queue({ ok: true });
    expect(await postMessage({ channel: 'C1' })).toEqual({ channel: '', ts: '' });
  });
});

describe('files', () => {
  it('reserves an upload url with the exact byte length', async () => {
    queue({ ok: true, upload_url: 'https://files.slack.com/u', file_id: 'F1' }, { ok: true });
    expect(await getFileUploadUrl('run.mp4', 1234)).toEqual({ upload_url: 'https://files.slack.com/u', file_id: 'F1' });
    expect(urlOf(0)).toContain('filename=run.mp4');
    expect(urlOf(0)).toContain('length=1234');
    expect(await getFileUploadUrl('x', 1)).toEqual({ upload_url: '', file_id: '' });
  });

  it('shares uploaded files in a thread with only the fields that were set', async () => {
    queue({ ok: true, files: [{ id: 'F1', title: 'run', permalink: 'https://p' }, {}] });
    const shared = await completeFileUpload({
      files: [{ id: 'F1', title: 'run' }],
      channel: 'C1',
      thread_ts: '1.1',
      initial_comment: 'recordings',
    });
    expect(shared).toEqual([
      { id: 'F1', title: 'run', permalink: 'https://p' },
      { id: '', title: '', permalink: '' },
    ]);
    expect(JSON.parse(initOf(0).body)).toEqual({
      files: [{ id: 'F1', title: 'run' }],
      channel_id: 'C1',
      thread_ts: '1.1',
      initial_comment: 'recordings',
    });
  });

  it('omits unset share options and tolerates a reply without files', async () => {
    queue({ ok: true });
    expect(await completeFileUpload({ files: [] })).toEqual([]);
    expect(JSON.parse(initOf(0).body)).toEqual({ files: [] });
  });

  it('refuses more files than Slack accepts in one message, before calling Slack', async () => {
    const files = Array.from({ length: SLACK_FILES_PER_MESSAGE + 1 }, (_, i) => ({ id: `F${i}`, title: 't' }));
    const err = await caught(completeFileUpload({ files }));
    expect(err.message).toContain(`at most ${SLACK_FILES_PER_MESSAGE} files`);
    expect(err.extensions.code).toBe('BAD_REQUEST');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('accepts exactly the per-message ceiling', async () => {
    queue({ ok: true, files: [] });
    const files = Array.from({ length: SLACK_FILES_PER_MESSAGE }, (_, i) => ({ id: `F${i}`, title: 't' }));
    await expect(completeFileUpload({ files })).resolves.toEqual([]);
  });

  it('deletes a file and treats an already-gone file as success', async () => {
    queue({ ok: true });
    await expect(deleteFile('F1')).resolves.toBeUndefined();
    expect(JSON.parse(initOf(0).body)).toEqual({ file: 'F1' });

    queue({ ok: false, error: 'file_not_found' }, { ok: false, error: 'file_deleted' });
    await expect(deleteFile('F2')).resolves.toBeUndefined();
    await expect(deleteFile('F3')).resolves.toBeUndefined();
  });

  it('rethrows any other delete failure', async () => {
    queue({ ok: false, error: 'cant_delete_file' });
    const err = await caught(deleteFile('F1'));
    expect(err.message).toBe('Slack rejected files.delete: cant_delete_file.');
  });
});

describe('channel membership', () => {
  it('joins a channel and maps the reply, falling back to the requested id', async () => {
    queue({ ok: true, channel: { id: 'C1', name: 'general', is_member: true } }, { ok: true });
    expect(await joinChannel('C1')).toMatchObject({ id: 'C1', name: 'general', is_member: true });
    expect(await joinChannel('C2')).toMatchObject({ id: 'C2', name: '', is_member: false });
  });

  it('does nothing when the bot is already a member', async () => {
    queue({ ok: true, channel: { is_member: true } });
    await ensureChannelMember('C1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(urlOf(0)).toContain('conversations.info?channel=C1');
  });

  it('joins when the bot is outside the channel', async () => {
    queue({ ok: true }, { ok: true, channel: { id: 'C1' } });
    await ensureChannelMember('C1');
    expect(urlOf(1)).toBe('https://slack.com/api/conversations.join');
    expect(JSON.parse(initOf(1).body)).toEqual({ channel: 'C1' });
  });
});

describe('authStatus', () => {
  it('reports granted, required and purpose per scope from the response header', async () => {
    mockFetch.mockResolvedValueOnce(reply({ ok: true, team: 'Duncit' }, { scopes: 'chat:write, channels:join' }));
    const status = await authStatus();
    expect(status.team).toBe('Duncit');
    expect(status.scopes_known).toBe(true);
    expect(status.scopes).toHaveLength(SLACK_BOT_SCOPES.length + SLACK_OPTIONAL_SCOPES.length);
    expect(status.scopes.find((s) => s.scope === 'chat:write')).toMatchObject({ granted: true, required: true });
    expect(status.scopes.find((s) => s.scope === 'channels:join')).toMatchObject({ granted: true, required: false });
    expect(status.scopes.find((s) => s.scope === 'files:write')).toMatchObject({ granted: false, required: false });
    expect(status.scopes.every((s) => s.purpose.length > 0)).toBe(true);
    expect(initOf(0).headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('marks scopes unknown when Slack sends no header, or the response has no headers at all', async () => {
    mockFetch.mockResolvedValueOnce(reply({ ok: true }));
    const noHeader = await authStatus();
    expect(noHeader).toMatchObject({ team: '', scopes_known: false });
    expect(noHeader.scopes.every((s) => !s.granted)).toBe(true);

    mockFetch.mockResolvedValueOnce({ status: 200, json: async () => ({ ok: true }) });
    expect((await authStatus()).scopes_known).toBe(false);
  });

  it('throws an actionable error when auth.test fails', async () => {
    mockFetch.mockResolvedValueOnce(reply({ ok: false, error: 'invalid_auth' }));
    const err = await caught(authStatus());
    expect(err.message).toContain('Slack rejected auth.test: invalid_auth');
  });
});
