/**
 * Every vendor credential check in envEntry.connection, with no network: fetch
 * is replaced per test and every SDK-style gateway is mocked. What is asserted
 * is what an operator reads — ok / message / details — and that the call made
 * to the vendor carries the credential the right way (and never echoes it).
 */
jest.mock('@modules/platform/appBuild/googlePlay.gateway', () => ({
  ...jest.requireActual('@modules/platform/appBuild/googlePlay.gateway'),
  playAccessToken: jest.fn(),
  openEdit: jest.fn(),
  discardEdit: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/appStoreConnect.gateway', () => ({
  ...jest.requireActual('@modules/platform/appBuild/appStoreConnect.gateway'),
  ascToken: jest.fn(),
  findApp: jest.fn(),
  assertCertificateAccess: jest.fn(),
}));
jest.mock('@modules/platform/msg91/msg91.gateway', () => ({
  ...jest.requireActual('@modules/platform/msg91/msg91.gateway'),
  msg91WidgetAnalytics: jest.fn(),
}));
jest.mock('@modules/access/auth/auth.apple', () => ({
  ...jest.requireActual('@modules/access/auth/auth.apple'),
  appleClientSecret: jest.fn(),
}));
jest.mock('@utils/sonarqube', () => ({
  ...jest.requireActual('@utils/sonarqube'),
  sonarGet: jest.fn(),
}));
jest.mock('@modules/platform/dns/godaddy.gateway', () => ({
  ...jest.requireActual('@modules/platform/dns/godaddy.gateway'),
  godaddyDomain: jest.fn(),
  godaddyRecords: jest.fn(),
}));
jest.mock('@modules/crm/marketing/social/social.probe', () => ({
  ...jest.requireActual('@modules/crm/marketing/social/social.probe'),
  probeSocialApps: jest.fn(),
}));

import {
  aisensyConnection,
  appleSignInConnection,
  appStoreConnectConnection,
  githubConnection,
  godaddyConnection,
  googlePlayConnection,
  isConnectionTestable,
  msg91Connection,
  razorpayConnection,
  runEnvConnectionCheck,
  shiprocketConnection,
  slackConnection,
  socialAppsConnection,
  sonarqubeConnection,
} from '../../envEntry.connection';
import { SLACK_BOT_SCOPES } from '@modules/platform/slack/slack.gateway';
import { discardEdit, openEdit, playAccessToken } from '@modules/platform/appBuild/googlePlay.gateway';
import { ascToken, assertCertificateAccess, findApp } from '@modules/platform/appBuild/appStoreConnect.gateway';
import { msg91WidgetAnalytics } from '@modules/platform/msg91/msg91.gateway';
import { APPLE_TOKEN_URL, appleClientSecret } from '@modules/access/auth/auth.apple';
import { sonarGet } from '@utils/sonarqube';
import { godaddyDomain, godaddyRecords } from '@modules/platform/dns/godaddy.gateway';
import { probeSocialApps } from '@modules/crm/marketing/social/social.probe';

/** The entry's fields, read the way the checks read them. */
const entry = (fields: Record<string, string>) => (name: string) => fields[name] ?? '';

/** A fetch answer: status, JSON body (or a body that is not JSON) and headers. */
function answer(status: number, body: unknown, headers?: Record<string, string>) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: body instanceof Error ? () => Promise.reject(body) : () => Promise.resolve(body),
    headers: headers ? { get: (name: string) => headers[name] ?? null } : undefined,
  };
}

let fetchMock: jest.Mock;
const respond = (status: number, body: unknown, headers?: Record<string, string>) =>
  fetchMock.mockResolvedValueOnce(answer(status, body, headers));
const lastInit = () => fetchMock.mock.calls.at(-1)?.[1] as RequestInit & { headers: Record<string, string> };

/** An unsigned JWT-shaped string carrying the given claims. */
const jwtWith = (claims: Record<string, unknown>) =>
  `h.${Buffer.from(JSON.stringify(claims)).toString('base64')}.s`;

beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
});

afterEach(() => {
  delete (global as any).fetch;
});

describe('slackConnection', () => {
  it('asks for the bot token first', async () => {
    expect(await slackConnection(entry({}))).toEqual({ ok: false, message: 'Bot token is required', details: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports the reason Slack gave for refusing the token, and none when it gave none', async () => {
    respond(200, { ok: false, error: 'invalid_auth' });
    expect((await slackConnection(entry({ bot_token: 'xoxb-test' }))).message).toBe('Slack rejected the token: invalid_auth');
    expect(lastInit().headers.Authorization).toBe('Bearer xoxb-test');
    respond(200, new SyntaxError('html'));
    expect((await slackConnection(entry({ bot_token: 'xoxb-test' }))).message).toBe('Slack rejected the token');
  });

  it('passes but warns when Slack does not report the scopes', async () => {
    respond(200, { ok: true, team: 'Duncit', user: 'duncit-bot' });
    const res = await slackConnection(entry({ bot_token: 'xoxb-test' }));
    expect(res.ok).toBe(true);
    expect(res.message).toBe('Slack workspace "Duncit" connected');
    expect(res.details[0]).toBe('Authenticated as duncit-bot');
    expect(res.details[1]).toMatch(/did not report the token scopes/);
  });

  it('fails a valid token that lacks a needed scope, naming it', async () => {
    const [first, ...rest] = SLACK_BOT_SCOPES;
    respond(200, { ok: true, team: 'Duncit' }, { 'x-oauth-scopes': rest.join(', ') });
    const res = await slackConnection(entry({ bot_token: 'xoxb-test' }));
    expect(res.ok).toBe(false);
    expect(res.message).toBe(`Slack token is valid but the bot is missing the scope ${first}`);
    expect(res.details.at(-1)).toMatch(/reinstall the app/);
  });

  it('passes when every scope is granted', async () => {
    respond(200, { ok: true }, { 'x-oauth-scopes': SLACK_BOT_SCOPES.join(',') });
    const res = await slackConnection(entry({ bot_token: 'xoxb-test' }));
    expect(res).toEqual({
      ok: true,
      message: 'Slack workspace "" connected',
      details: ['All scopes needed for listing channels and posting are granted.'],
    });
  });
});

describe('shiprocketConnection', () => {
  const creds = { email: 'api@example.com', password: 'not-a-real-password' };

  it('asks for both email and password', async () => {
    expect((await shiprocketConnection(entry({ email: 'a@example.com' }))).message).toBe(
      'Account email and password are required',
    );
  });

  it('explains a 403 as the API-user mistake and repeats ShipRocket’s reason', async () => {
    respond(403, { message: 'Invalid email and password combination' });
    const res = await shiprocketConnection(entry(creds));
    expect(res.ok).toBe(false);
    expect(res.message).toBe('ShipRocket rejected the credentials (HTTP 403): Invalid email and password combination');
    expect(res.details[0]).toMatch(/Use an API user/);
    expect(JSON.parse(String(lastInit().body))).toEqual(creds);
  });

  it('fails a non-403 refusal without the hint, and a 200 that carries no token', async () => {
    respond(500, {});
    expect(await shiprocketConnection(entry(creds))).toEqual({
      ok: false,
      message: 'ShipRocket rejected the credentials (HTTP 500)',
      details: [],
    });
    respond(200, { token: 42 });
    expect((await shiprocketConnection(entry(creds))).ok).toBe(false);
  });

  it('reports the token lifetime, the company and the pickup location', async () => {
    const exp = Date.UTC(2030, 0, 2, 3, 4, 5) / 1000;
    respond(200, { token: jwtWith({ exp }), company_id: 9876 });
    const res = await shiprocketConnection(entry({ ...creds, pickup_location: 'Main Warehouse' }));
    expect(res).toEqual({
      ok: true,
      message: 'ShipRocket accepted the credentials and issued a token',
      details: [
        `Token valid until ${new Date(exp * 1000).toUTCString()}`,
        'ShipRocket company id 9876',
        'Default pickup location "Main Warehouse" — it must match a warehouse in ShipRocket.',
      ],
    });
  });

  it.each([
    ['opaque', 'Token issued (opaque — it carries no readable expiry)'],
    [jwtWith({ sub: 'x' }), 'Token issued with no expiry claim'],
    ['h.%%%not-json%%%.s', 'Token issued (opaque — it carries no readable expiry)'],
  ])('describes token %p honestly and warns about a missing pickup', async (token, lifetime) => {
    respond(200, { token });
    const res = await shiprocketConnection(entry(creds));
    expect(res.details).toEqual([
      lifetime,
      'No default pickup location set — shipments cannot be booked without one.',
    ]);
  });
});

describe('razorpayConnection', () => {
  it('asks for both keys', async () => {
    expect((await razorpayConnection(entry({ key_id: 'rzp_test_1' }))).ok).toBe(false);
  });

  it('sends Basic auth and repeats Razorpay’s refusal', async () => {
    respond(401, { error: { description: 'The api key provided is invalid' } });
    const res = await razorpayConnection(entry({ key_id: 'rzp_test_1', key_secret: 'fake-secret-value' }));
    expect(res.message).toBe('Razorpay rejected the key id or secret (HTTP 401): The api key provided is invalid');
    expect(lastInit().headers.Authorization).toBe(
      `Basic ${Buffer.from('rzp_test_1:fake-secret-value').toString('base64')}`,
    );
    expect(JSON.stringify(res)).not.toContain('fake-secret-value');
    respond(500, {});
    expect((await razorpayConnection(entry({ key_id: 'rzp_test_1', key_secret: 'fake-secret-value' }))).message).toBe(
      'Razorpay rejected the key id or secret (HTTP 500)',
    );
  });

  it('flags live mode and a configured webhook secret', async () => {
    respond(200, { items: [] });
    const res = await razorpayConnection(entry({ key_id: 'rzp_live_1', key_secret: 's', webhook_secret: 'w' }));
    expect(res).toEqual({
      ok: true,
      message: 'Razorpay accepted the key id and secret',
      details: ['LIVE mode — real money', 'Webhook secret set — inbound Razorpay webhooks are verified.'],
    });
  });

  it('flags test mode and an unverifiable webhook', async () => {
    respond(200, { items: [] });
    const res = await razorpayConnection(entry({ key_id: 'rzp_test_1', key_secret: 's' }));
    expect(res.details).toEqual([
      'Test mode — no real money moves',
      'No webhook secret — inbound Razorpay webhooks cannot be verified.',
    ]);
  });
});

describe('aisensyConnection', () => {
  const liveKey = jwtWith({ exp: Date.UTC(2100, 0, 1) / 1000 });

  it('asks for the key, and refuses one that has expired without sending anything', async () => {
    expect((await aisensyConnection(entry({}), '919000000000')).message).toBe('Campaign API key is required');
    const expMs = Date.UTC(2020, 5, 1);
    const res = await aisensyConnection(entry({ api_key: jwtWith({ exp: expMs / 1000 }) }), '919000000000');
    expect(res.message).toBe(`Campaign API key expired on ${new Date(expMs).toDateString()} — issue a new one in AiSensy`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('without a destination, passes on the key alone and spends no message', async () => {
    const res = await aisensyConnection(entry({ api_key: 'opaque-key' }), '  ');
    expect(res).toEqual({
      ok: true,
      message: 'Campaign API key is set and unexpired — send a test message to verify delivery',
      details: ['Project API not configured — campaign and template details cannot be read back.'],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('needs a campaign name before it can send', async () => {
    const res = await aisensyConnection(entry({ api_key: liveKey, project_id: 'p', project_api_key: 'k' }), '+91 90000 00000');
    expect(res).toEqual({
      ok: false,
      message: 'Default Campaign Name is required before a test message can be sent',
      details: ['Project API configured — campaign and template details can be read back.'],
    });
  });

  it('sends one template message to the digits of the destination and reports the message id', async () => {
    respond(200, { success: 'true', submitted_message_id: 'msg-1' });
    const res = await aisensyConnection(
      entry({ api_key: liveKey, campaign_name: 'otp_test', base_url: 'https://aisensy.example.test/' }),
      '+91 90000-00000',
    );
    expect(fetchMock.mock.calls[0][0]).toBe('https://aisensy.example.test/campaign/t1/api/v2');
    expect(JSON.parse(String(lastInit().body))).toMatchObject({
      apiKey: liveKey,
      campaignName: 'otp_test',
      destination: '919000000000',
      userName: 'Duncit Tech',
      templateParams: [],
    });
    expect(res).toEqual({
      ok: true,
      message: 'AiSensy accepted a WhatsApp test message for 919000000000',
      details: [
        'Campaign "otp_test" -> 919000000000',
        'Project API not configured — campaign and template details cannot be read back.',
        'AiSensy message id msg-1',
      ],
    });
  });

  it('reports AiSensy’s reason for refusing the message, on an error status or a false success', async () => {
    respond(400, { message: 'Campaign not live' });
    const refused = await aisensyConnection(entry({ api_key: liveKey, campaign_name: 'c' }), '919000000000');
    expect(refused.message).toBe('AiSensy rejected the test message: Campaign not live');
    expect(fetchMock.mock.calls[0][0]).toBe('https://backend.aisensy.com/campaign/t1/api/v2');
    respond(200, { success: false });
    const falsy = await aisensyConnection(entry({ api_key: liveKey, campaign_name: 'c' }), '919000000000');
    expect(falsy.message).toBe('AiSensy rejected the test message: HTTP 200');
  });

  it('passes without a message id when AiSensy returns none', async () => {
    respond(200, { success: true });
    const res = await aisensyConnection(entry({ api_key: liveKey, campaign_name: 'c' }), '919000000000');
    expect(res.ok).toBe(true);
    expect(res.details).toHaveLength(2);
  });
});

describe('githubConnection', () => {
  const creds = { token: 'ghp_test', owner: 'acme', repo: 'app' };

  it('needs token, owner and repo', async () => {
    expect((await githubConnection(entry({ token: 't', owner: 'acme' }))).message).toBe(
      'Access token, owner and repository name are all required',
    );
  });

  it('reads a 404 as invisible-or-missing, and repeats GitHub’s message otherwise', async () => {
    respond(404, { message: 'Not Found' });
    expect((await githubConnection(entry(creds))).message).toBe(
      'GitHub rejected the request (HTTP 404): no such repository, or the token cannot see it',
    );
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/acme/app');
    expect(lastInit().headers.Authorization).toBe('Bearer ghp_test');
    respond(401, { message: 'Bad credentials' });
    expect((await githubConnection(entry(creds))).message).toBe('GitHub rejected the request (HTTP 401): Bad credentials');
    respond(500, {});
    expect((await githubConnection(entry(creds))).message).toBe('GitHub rejected the request (HTTP 500): ');
  });

  it('passes with write access and the rate-limit headroom', async () => {
    respond(200, { full_name: 'acme/app', permissions: { push: true } }, { 'x-ratelimit-remaining': '4999' });
    expect(await githubConnection(entry(creds))).toEqual({
      ok: true,
      message: 'Connected to acme/app',
      details: [
        '4999 API requests left in the current rate-limit window.',
        'The token can write to this repository, so it can start builds.',
      ],
    });
  });

  it('passes but states the ambiguity when write access cannot be confirmed', async () => {
    respond(200, { permissions: { push: false } });
    const res = await githubConnection(entry(creds));
    expect(res.message).toBe('Connected to acme/app');
    expect(res.details).toHaveLength(1);
    expect(res.details[0]).toMatch(/Could not confirm write access/);
  });
});

describe('googlePlayConnection', () => {
  const key = JSON.stringify({ client_email: 'play@example.iam.gserviceaccount.com', private_key: 'fake-key' });

  it('needs the key and the package name', async () => {
    expect((await googlePlayConnection(entry({ service_account_json: key }))).message).toBe(
      'Service account key and package name are both required',
    );
  });

  it('repeats why the key could not be read', async () => {
    const res = await googlePlayConnection(entry({ service_account_json: '{not json', package_name: 'com.example' }));
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/not valid JSON/);
    expect(playAccessToken).not.toHaveBeenCalled();
  });

  it('names the signed-in account when Play refuses the edit', async () => {
    (playAccessToken as jest.Mock).mockResolvedValue('tok');
    (openEdit as jest.Mock).mockRejectedValue(new Error('Google Play refused (HTTP 403)'));
    const res = await googlePlayConnection(entry({ service_account_json: key, package_name: 'com.example' }));
    expect(res.message).toBe('Google Play refused (HTTP 403)');
    expect(res.details[0]).toMatch(/^Signed in as play@example\.iam\.gserviceaccount\.com\./);
    expect(discardEdit).not.toHaveBeenCalled();
  });

  it('reports a non-Error failure as its string form', async () => {
    (playAccessToken as jest.Mock).mockRejectedValue('token endpoint down');
    const res = await googlePlayConnection(entry({ service_account_json: key, package_name: 'com.example' }));
    expect(res.message).toBe('token endpoint down');
  });

  it('opens and immediately discards an edit, changing nothing', async () => {
    (playAccessToken as jest.Mock).mockResolvedValue('tok');
    (openEdit as jest.Mock).mockResolvedValue('edit-1');
    (discardEdit as jest.Mock).mockResolvedValue(undefined);
    const res = await googlePlayConnection(entry({ service_account_json: key, package_name: 'com.example' }));
    expect(openEdit).toHaveBeenCalledWith('tok', 'com.example');
    expect(discardEdit).toHaveBeenCalledWith('tok', 'com.example', 'edit-1');
    expect(res).toMatchObject({ ok: true, message: 'Connected to com.example' });
  });
});

describe('msg91Connection', () => {
  afterEach(() => jest.useRealTimers());

  it('needs both the widget id and the auth key', async () => {
    expect((await msg91Connection(entry({ widget_id: 'w' }))).message).toBe('Widget ID and auth key are both required');
  });

  it('reads today’s analytics and reports the counts', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-03T08:00:00.000Z'));
    (msg91WidgetAnalytics as jest.Mock).mockResolvedValue({ total: { total: 12, verified: 9 } });
    const res = await msg91Connection(entry({ widget_id: 'w', auth_key: 'k' }));
    expect(msg91WidgetAnalytics).toHaveBeenCalledWith(
      { widget_id: 'w', auth_key: 'k' },
      { startDate: '2026-10-03', endDate: '2026-10-03' },
    );
    expect(res.ok).toBe(true);
    expect(res.details[0]).toBe('Widget requests today: 12 (verified: 9)');
  });

  it('reads missing totals as zero', async () => {
    (msg91WidgetAnalytics as jest.Mock).mockResolvedValue({});
    expect((await msg91Connection(entry({ widget_id: 'w', auth_key: 'k' }))).details[0]).toBe(
      'Widget requests today: 0 (verified: 0)',
    );
  });

  it('repeats MSG91’s refusal', async () => {
    (msg91WidgetAnalytics as jest.Mock).mockRejectedValue(new Error('Invalid authkey'));
    expect(await msg91Connection(entry({ widget_id: 'w', auth_key: 'k' }))).toEqual({
      ok: false,
      message: 'Invalid authkey',
      details: [],
    });
  });
});

describe('appleSignInConnection', () => {
  const creds = { team_id: ' TEAM1 ', key_id: 'KEY1', services_id: 'com.example.web', private_key: 'fake-p8' };

  it('needs every field', async () => {
    expect((await appleSignInConnection(entry({ ...creds, team_id: ' ' }))).message).toBe(
      'Team ID, Services ID, Key ID and private key are all required',
    );
  });

  it('refuses a key that cannot sign, without calling Apple', async () => {
    (appleClientSecret as jest.Mock).mockImplementation(() => {
      throw new Error('bad key');
    });
    const res = await appleSignInConnection(entry(creds));
    expect(res.message).toMatch(/cannot sign/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads invalid_grant as the client being accepted', async () => {
    (appleClientSecret as jest.Mock).mockReturnValue('signed-secret');
    respond(400, { error: 'invalid_grant' });
    const res = await appleSignInConnection(entry(creds));
    expect(appleClientSecret).toHaveBeenCalledWith({
      teamId: 'TEAM1',
      keyId: 'KEY1',
      clientId: 'com.example.web',
      privateKey: 'fake-p8',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(APPLE_TOKEN_URL);
    const body = new URLSearchParams(String(lastInit().body));
    expect(body.get('client_id')).toBe('com.example.web');
    expect(body.get('code')).toBe('duncit-connection-check');
    expect(res).toMatchObject({ ok: true, message: 'Apple accepted this key for com.example.web' });
  });

  it.each([
    [{ error: 'invalid_client' }, 401, 'Apple rejected this client'],
    [{ error: 'unsupported_grant_type' }, 400, 'Apple answered unsupported_grant_type'],
    [{}, 503, 'Apple answered HTTP 503'],
  ])('fails on %j', async (body, status, message) => {
    (appleClientSecret as jest.Mock).mockReturnValue('signed-secret');
    respond(status, body);
    const res = await appleSignInConnection(entry(creds));
    expect(res.ok).toBe(false);
    expect(res.message).toBe(message);
  });
});

describe('appStoreConnectConnection', () => {
  const creds = { issuer_id: 'iss', key_id: 'kid', private_key: 'fake-p8', bundle_id: 'com.example.app' };

  it('needs every field', async () => {
    expect((await appStoreConnectConnection(entry({ ...creds, bundle_id: '' }))).ok).toBe(false);
  });

  it('refuses a key that cannot sign', async () => {
    (ascToken as jest.Mock).mockImplementation(() => {
      throw new Error('bad pem');
    });
    expect((await appStoreConnectConnection(entry(creds))).message).toMatch(/cannot sign/);
    expect(findApp).not.toHaveBeenCalled();
  });

  it('reports a refused app lookup', async () => {
    (ascToken as jest.Mock).mockReturnValue('asc-token');
    (findApp as jest.Mock).mockRejectedValue(new Error('401 NOT_AUTHORIZED'));
    const res = await appStoreConnectConnection(entry(creds));
    expect(findApp).toHaveBeenCalledWith('asc-token', 'com.example.app');
    expect(res).toMatchObject({ ok: false, message: '401 NOT_AUTHORIZED' });
  });

  it('fails a key without the Admin role, noting the app is not created yet', async () => {
    (ascToken as jest.Mock).mockReturnValue('asc-token');
    (findApp as jest.Mock).mockResolvedValue(null);
    (assertCertificateAccess as jest.Mock).mockRejectedValue('FORBIDDEN_ERROR');
    const res = await appStoreConnectConnection(entry(creds));
    expect(res.ok).toBe(false);
    expect(res.message).toBe('This key cannot manage certificates');
    expect(res.details[0]).toMatch(/^No App Store Connect app uses com\.example\.app yet/);
    expect(res.details[1]).toBe('FORBIDDEN_ERROR');
  });

  it('passes and names the app', async () => {
    (ascToken as jest.Mock).mockReturnValue('asc-token');
    (findApp as jest.Mock).mockResolvedValue({ name: 'Duncit' });
    (assertCertificateAccess as jest.Mock).mockResolvedValue(undefined);
    const res = await appStoreConnectConnection(entry(creds));
    expect(res).toMatchObject({ ok: true, message: 'Apple accepted this key for com.example.app' });
    expect(res.details[0]).toBe('App Store Connect has the app "Duncit" for com.example.app.');
  });
});

describe('sonarqubeConnection', () => {
  const creds = { host_url: 'https://sonar.example.test', token: 'squ_test', project_key: 'duncit' };

  it('needs every field', async () => {
    expect((await sonarqubeConnection(entry({ host_url: 'x' }))).ok).toBe(false);
  });

  it('reads the quality gate and counts failing conditions', async () => {
    (sonarGet as jest.Mock).mockResolvedValue({
      projectStatus: { status: 'ERROR', conditions: [{ status: 'ERROR' }, { status: 'OK' }, { status: 'ERROR' }] },
    });
    const res = await sonarqubeConnection(entry(creds));
    expect(sonarGet).toHaveBeenCalledWith(
      { hostUrl: 'https://sonar.example.test', token: 'squ_test', projectKey: 'duncit' },
      '/api/qualitygates/project_status',
      { projectKey: 'duncit' },
    );
    expect(res).toEqual({ ok: true, message: 'Connected to duncit', details: ['Quality gate: ERROR, 2 failing condition(s).'] });
  });

  it('handles a gate with no conditions and a refused call', async () => {
    (sonarGet as jest.Mock).mockResolvedValueOnce({ projectStatus: { status: 'OK' } });
    expect((await sonarqubeConnection(entry(creds))).details).toEqual(['Quality gate: OK, 0 failing condition(s).']);
    (sonarGet as jest.Mock).mockRejectedValueOnce(new Error('Insufficient privileges'));
    expect((await sonarqubeConnection(entry(creds))).message).toBe('Insufficient privileges');
  });
});

describe('godaddyConnection', () => {
  const creds = { api_key: 'k', api_secret: 's', domain: ' Example.COM ' };

  it('needs key, secret and domain', async () => {
    expect((await godaddyConnection(entry({ api_key: 'k' }))).message).toBe('API key, API secret and domain are all required');
  });

  it('counts records and warns when the nameservers are not GoDaddy’s', async () => {
    (godaddyDomain as jest.Mock).mockResolvedValue({
      status: 'ACTIVE',
      nameServers: ['ns1.domaincontrol.com', 'ns.cloudflare.com'],
    });
    (godaddyRecords as jest.Mock).mockResolvedValue([{}, {}, {}]);
    const res = await godaddyConnection(entry(creds));
    expect(godaddyDomain).toHaveBeenCalledWith({ apiKey: 'k', apiSecret: 's', domain: 'example.com' });
    expect(res).toEqual({
      ok: true,
      message: 'Connected to example.com (ACTIVE)',
      details: [
        '3 DNS records in the zone.',
        'Nameservers: ns1.domaincontrol.com, ns.cloudflare.com.',
        "Some nameservers are not GoDaddy's, so records edited here may not be what the internet sees.",
      ],
    });
  });

  it('lists only the record count when no nameservers are reported', async () => {
    (godaddyDomain as jest.Mock).mockResolvedValue({ status: 'ACTIVE' });
    (godaddyRecords as jest.Mock).mockResolvedValue([]);
    expect((await godaddyConnection(entry(creds))).details).toEqual(['0 DNS records in the zone.']);
  });

  it('repeats a refusal', async () => {
    (godaddyDomain as jest.Mock).mockRejectedValue('ACCESS_DENIED');
    expect(await godaddyConnection(entry(creds))).toEqual({ ok: false, message: 'ACCESS_DENIED', details: [] });
  });
});

describe('runEnvConnectionCheck', () => {
  it('knows which categories have a check', () => {
    expect(isConnectionTestable('GITHUB')).toBe(true);
    expect(isConnectionTestable('SOCIAL_APPS')).toBe(true);
    expect(isConnectionTestable('EMAIL')).toBe(false);
  });

  it('dispatches to the category’s check', async () => {
    respond(200, { items: [] });
    const res = await runEnvConnectionCheck('RAZORPAY', entry({ key_id: 'rzp_test_1', key_secret: 's' }));
    expect(res.message).toBe('Razorpay accepted the key id and secret');
  });

  it('hands AiSensy the test destination', async () => {
    respond(200, { success: true });
    const key = jwtWith({ exp: Date.UTC(2100, 0, 1) / 1000 });
    const res = await runEnvConnectionCheck('AISENSY', entry({ api_key: key, campaign_name: 'c' }), { to: '919000000000' });
    expect(res.message).toBe('AiSensy accepted a WhatsApp test message for 919000000000');
  });

  it('runs the social-apps probe it re-exports', async () => {
    expect(socialAppsConnection).toBe(probeSocialApps);
    (probeSocialApps as jest.Mock).mockResolvedValue({ ok: true, message: 'All apps answered', details: [] });
    const str = entry({});
    expect(await runEnvConnectionCheck('SOCIAL_APPS', str)).toEqual({ ok: true, message: 'All apps answered', details: [] });
    expect(probeSocialApps).toHaveBeenCalledWith(str);
  });

  it.each(['AbortError', 'TimeoutError'])('turns a %s into a time-out result', async (name) => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name }));
    expect(await runEnvConnectionCheck('SLACK', entry({ bot_token: 'xoxb-test' }))).toEqual({
      ok: false,
      message: 'SLACK did not answer within 12s',
      details: [],
    });
  });

  it('names the real connection failure hidden on the cause', async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:443' } }),
    );
    expect(await runEnvConnectionCheck('GITHUB', entry({ token: 't', owner: 'o', repo: 'r' }))).toEqual({
      ok: false,
      message: 'Connection failed: ECONNREFUSED (connect ECONNREFUSED 127.0.0.1:443)',
      details: [],
    });
  });
});
