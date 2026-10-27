import { parse, Kind, type OperationDefinitionNode } from 'graphql';
import { APP_HEADER, describeRequest, rateLimitMiddleware, rateLimitPlugin, socketAllowed } from '../../rateLimit.guard';
import { evaluate, shouldSendHeaders } from '../../rateLimit.enforcer';
import { decodeAuthUser } from '@context';
import { isStressTraffic } from '../../../stressTest/stressTest.traffic';
import { isE2eTraffic } from '../../../e2eRun/e2eRun.traffic';
import { logs } from '@observability/log';

jest.mock('../../rateLimit.enforcer', () => ({ evaluate: jest.fn(), shouldSendHeaders: jest.fn() }));
jest.mock('@context', () => ({ decodeAuthUser: jest.fn() }));
jest.mock('../../../stressTest/stressTest.traffic', () => ({ isStressTraffic: jest.fn() }));
jest.mock('../../../e2eRun/e2eRun.traffic', () => ({ isE2eTraffic: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

const request = (over: Record<string, any> = {}) => ({
  headers: {}, path: '/upload/avatar', method: 'POST', ip: '1.2.3.4', ...over,
}) as any;
const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  (decodeAuthUser as jest.Mock).mockReturnValue(null);
  (isStressTraffic as jest.Mock).mockReturnValue(false);
  (isE2eTraffic as jest.Mock).mockResolvedValue(false);
  (evaluate as jest.Mock).mockResolvedValue({ allowed: true });
  (shouldSendHeaders as jest.Mock).mockResolvedValue(true);
});

describe('describeRequest', () => {
  it('reads surface, app, path, ip and device off an anonymous request', () => {
    const { request: r, info } = describeRequest(
      request({ headers: { 'x-duncit-surface': 'mweb', [APP_HEADER]: 'Duncit', 'x-duid': ' dev-1 ', 'user-agent': 'UA/1' } }),
      'REST'
    );
    expect(r).toEqual({
      channel: 'REST', surface: 'MWEB', app: 'duncit', path: '/upload/avatar', method: 'POST', ip: '1.2.3.4', userId: undefined, roles: [], deviceId: 'dev-1',
    });
    expect(info).toEqual({ userAgent: 'UA/1', userEmail: undefined });
  });

  it('takes the signed-in user from the bearer token', () => {
    (decodeAuthUser as jest.Mock).mockReturnValue({ id: 'u1', roles: ['USER'], email: 'a@b.com' });
    const { request: r, info } = describeRequest(request({ headers: { authorization: 'Bearer t' } }), 'GRAPHQL');
    expect(decodeAuthUser).toHaveBeenCalledWith('Bearer t');
    expect(r).toMatchObject({ userId: 'u1', roles: ['USER'] });
    expect(info.userEmail).toBe('a@b.com');
  });

  it('treats a user with no email as having none', () => {
    (decodeAuthUser as jest.Mock).mockReturnValue({ id: 'u1', roles: [], email: null });
    expect(describeRequest(request(), 'REST').info.userEmail).toBeUndefined();
  });

  it('calls an api-key caller an API integration whatever surface it declared', () => {
    const { request: r } = describeRequest(request({ headers: { 'x-api-key': 'k', 'x-duncit-surface': 'portal', [APP_HEADER]: 'tech' } }), 'REST');
    expect(r).toMatchObject({ surface: 'API', app: 'public-api' });
  });

  it('uses the first value of a repeated header and ignores blank ones', () => {
    const { request: r } = describeRequest(request({ headers: { 'x-duncit-surface': ['native', 'web'], 'x-duid': '   ' } }), 'REST');
    expect(r.surface).toBe('NATIVE');
    expect(r.deviceId).toBeUndefined();
  });

  it('has no ip when the framework gave none', () => {
    expect(describeRequest(request({ ip: undefined }), 'REST').request.ip).toBe('');
  });
});

describe('rateLimitMiddleware', () => {
  const res = () => {
    const out: any = { set: jest.fn(), json: jest.fn() };
    out.status = jest.fn(() => out);
    return out;
  };

  it.each(['/graphql', '/graphql/batch', '/health', '/status/db'])('never limits %s', (path) => {
    const next = jest.fn();
    rateLimitMiddleware(request({ path }), res(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('lets stress-run traffic through uncounted', () => {
    (isStressTraffic as jest.Mock).mockReturnValue(true);
    const next = jest.fn();
    rateLimitMiddleware(request(), res(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('passes an allowed request on', async () => {
    const next = jest.fn();
    const response = res();
    rateLimitMiddleware(request(), response, next);
    await settle();
    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
    expect((evaluate as jest.Mock).mock.calls[0][0]).toMatchObject({ channel: 'REST', path: '/upload/avatar' });
  });

  it('answers 429 with the reason and the rate headers when headers are on', async () => {
    (evaluate as jest.Mock).mockResolvedValue({ allowed: false, message: 'Too many uploads', limit: 10, remaining: 0, retry_after: 30 });
    const next = jest.fn();
    const response = res();
    rateLimitMiddleware(request(), response, next);
    await settle();
    expect(next).not.toHaveBeenCalled();
    expect(response.set).toHaveBeenCalledWith({
      'X-RateLimit-Limit': '10', 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '30', 'Retry-After': '30',
    });
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({ error: 'rate_limited', message: 'Too many uploads' });
  });

  it('answers 429 without headers when they are switched off, and sends only the headers it has', async () => {
    (shouldSendHeaders as jest.Mock).mockResolvedValue(false);
    (evaluate as jest.Mock).mockResolvedValue({ allowed: false, message: 'slow down' });
    const response = res();
    rateLimitMiddleware(request(), response, jest.fn());
    await settle();
    expect(response.set).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(429);

    (shouldSendHeaders as jest.Mock).mockResolvedValue(true);
    (evaluate as jest.Mock).mockResolvedValue({ allowed: false, message: 'm' });
    const bare = res();
    rateLimitMiddleware(request(), bare, jest.fn());
    await settle();
    expect(bare.set).toHaveBeenCalledWith({});
  });

  it('never becomes the reason a request fails: it logs and lets the caller through', async () => {
    (evaluate as jest.Mock).mockRejectedValue(new Error('redis down'));
    const next = jest.fn();
    rateLimitMiddleware(request(), res(), next);
    await settle();
    expect(next).toHaveBeenCalledTimes(1);
    expect(logs.server.error).toHaveBeenCalledWith('rateLimit', 'middleware', { error: expect.any(Error), path: '/upload/avatar' });
  });
});

describe('rateLimitPlugin', () => {
  const didResolve = async () => {
    const hooks = await rateLimitPlugin.requestDidStart?.({} as never);
    return (hooks as { didResolveOperation: (ctx: any) => Promise<void> }).didResolveOperation;
  };
  const ctxFor = (query: string, req = request()) => {
    const document = parse(query);
    const operation = document.definitions.find((d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION);
    return { operation, contextValue: { req } };
  };

  it('does nothing when there is no operation to govern', async () => {
    await (await didResolve())({ operation: undefined, contextValue: { req: request() } });
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('does not govern an introspection-only document', async () => {
    await (await didResolve())(ctxFor('{ __typename __schema { types { name } } }'));
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('ignores inline fragments when listing the selected fields', async () => {
    await (await didResolve())(ctxFor('{ ... on Query { me } pods }'));
    expect((evaluate as jest.Mock).mock.calls[0][0]).toMatchObject({ fields: ['pods'], operation: 'pods' });
  });

  it('leaves stress-run and live e2e traffic uncounted', async () => {
    (isStressTraffic as jest.Mock).mockReturnValue(true);
    await (await didResolve())(ctxFor('{ me }'));
    expect(evaluate).not.toHaveBeenCalled();
    (isStressTraffic as jest.Mock).mockReturnValue(false);
    (isE2eTraffic as jest.Mock).mockResolvedValue(true);
    await (await didResolve())(ctxFor('{ me }'));
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('evaluates an allowed document once, with every selected field and the operation kind', async () => {
    await (await didResolve())(ctxFor('mutation { loginWithOtp __typename sendOtp }'));
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect((evaluate as jest.Mock).mock.calls[0][0]).toMatchObject({
      channel: 'GRAPHQL', operation: 'loginWithOtp', fields: ['loginWithOtp', 'sendOtp'], operationType: 'MUTATION',
    });
  });

  it('refuses a document over its limit with a 429 GraphQL error carrying the headers', async () => {
    (evaluate as jest.Mock).mockResolvedValue({ allowed: false, message: 'Too many logins', rule_name: 'Login', retry_after: 12, limit: 5, remaining: 0 });
    const error: any = await (await didResolve())(ctxFor('mutation { loginWithOtp }')).catch((e: unknown) => e);
    expect(error.message).toBe('Too many logins');
    expect(error.extensions).toMatchObject({ code: 'RATE_LIMITED', rule: 'Login', retry_after: 12 });
    expect(error.extensions.http.status).toBe(429);
    expect(Object.fromEntries(error.extensions.http.headers)).toMatchObject({ 'retry-after': '12', 'x-ratelimit-limit': '5' });
  });

  it('refuses without headers when they are off, and with a default message when none was given', async () => {
    (shouldSendHeaders as jest.Mock).mockResolvedValue(false);
    (evaluate as jest.Mock).mockResolvedValue({ allowed: false });
    const error: any = await (await didResolve())(ctxFor('{ me }')).catch((e: unknown) => e);
    expect(error.message).toBe('Too many requests.');
    expect([...error.extensions.http.headers]).toEqual([]);
  });
});

describe('socketAllowed', () => {
  it('asks the enforcer about a handshake, naming the signed-in user from the token', async () => {
    (decodeAuthUser as jest.Mock).mockReturnValue({ id: 'u1', roles: ['USER'], email: 'a@b.com' });
    (evaluate as jest.Mock).mockResolvedValue({ allowed: false, message: 'reconnect storm' });
    await expect(socketAllowed({ address: '9.9.9.9', token: 'tok', surface: 'native', app: 'Duncit', userAgent: 'UA' })).resolves.toEqual({ allowed: false, message: 'reconnect storm' });
    expect(decodeAuthUser).toHaveBeenCalledWith('Bearer tok');
    expect(evaluate).toHaveBeenCalledWith(
      { channel: 'SOCKET', surface: 'NATIVE', app: 'duncit', ip: '9.9.9.9', userId: 'u1', roles: ['USER'] },
      { userAgent: 'UA', userEmail: 'a@b.com' }
    );
  });

  it('handles an anonymous handshake with no token, surface or app', async () => {
    await socketAllowed({ address: '9.9.9.9' });
    expect(decodeAuthUser).toHaveBeenCalledWith(undefined);
    expect(evaluate).toHaveBeenCalledWith(
      { channel: 'SOCKET', surface: 'UNKNOWN', app: '-', ip: '9.9.9.9', userId: undefined, roles: [] },
      { userAgent: undefined, userEmail: undefined }
    );
  });

  it('treats a user with no email as having none', async () => {
    (decodeAuthUser as jest.Mock).mockReturnValue({ id: 'u1', roles: [], email: null });
    await socketAllowed({ address: '1.1.1.1', token: 't' });
    expect((evaluate as jest.Mock).mock.calls[0][1].userEmail).toBeUndefined();
  });
});
