/**
 * describeRequest — what a rate-limit rule can match on, read off one request.
 *
 * The third argument is the account the GraphQL context already verified. It is
 * the only way an operation run for a non-JWT credential (an MCP or table API
 * token) is attributed to its person; left out, the JWT in the header decides,
 * exactly as before. Tokens are real JWTs signed with the secret the decoder
 * verifies with, so nothing about the decoding is mocked.
 */
jest.mock('../../rateLimit.enforcer', () => ({ evaluate: jest.fn(), shouldSendHeaders: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));

import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthUser } from '@context';
import { APP_HEADER, describeRequest } from '../../rateLimit.guard';

/** The same secret expression decodeAuthUser verifies with (context.ts). */
const SECRET = process.env.JWT_SECRET || 'dev-secret';

const JWT_USER = { id: '64b7f0c2a1e4c9d3f0a1b2c3', email: 'asha@duncit.com', roles: ['POD_MANAGER'] };
const MCP_USER: AuthUser = { id: '64b7f0c2a1e4c9d3f0a1b2c4', email: 'ravi@duncit.com', roles: ['MCP_USER', 'FINANCE_MANAGER'] };

const jwtHeader = (payload: object = JWT_USER, secret = SECRET) => `Bearer ${jwt.sign(payload, secret)}`;

function requestWith(headers: Record<string, string | string[] | undefined>, over: Partial<Request> = {}): Request {
  return {
    headers,
    path: '/graphql',
    method: 'POST',
    ip: '203.0.113.7',
    ...over,
  } as unknown as Request;
}

describe('describeRequest — who the caller is', () => {
  it('reads the person from the JWT when no verified user is passed', () => {
    const { request, info } = describeRequest(requestWith({ authorization: jwtHeader() }), 'GRAPHQL');
    expect(request.userId).toBe(JWT_USER.id);
    expect(request.roles).toEqual(['POD_MANAGER']);
    expect(info.userEmail).toBe('asha@duncit.com');
  });

  it('treats a non-JWT bearer (an MCP access token) as anonymous when no verified user is passed', () => {
    const { request, info } = describeRequest(requestWith({ authorization: 'Bearer dmcp_at_x' }), 'GRAPHQL');
    expect(request.userId).toBeUndefined();
    expect(request.roles).toEqual([]);
    expect(info.userEmail).toBeUndefined();
  });

  it('attributes a non-JWT bearer call to the verified user the context resolved', () => {
    const { request, info } = describeRequest(requestWith({ authorization: 'Bearer dmcp_at_x' }), 'GRAPHQL', MCP_USER);
    expect(request.userId).toBe(MCP_USER.id);
    expect(request.roles).toEqual(['MCP_USER', 'FINANCE_MANAGER']);
    expect(info.userEmail).toBe('ravi@duncit.com');
  });

  it('lets an explicit null win over a valid JWT in the header (the context found no one)', () => {
    const { request, info } = describeRequest(requestWith({ authorization: jwtHeader() }), 'GRAPHQL', null);
    expect(request.userId).toBeUndefined();
    expect(request.roles).toEqual([]);
    expect(info.userEmail).toBeUndefined();
  });

  it('prefers the verified user over whatever the header decodes to', () => {
    const { request } = describeRequest(requestWith({ authorization: jwtHeader() }), 'GRAPHQL', MCP_USER);
    expect(request.userId).toBe(MCP_USER.id);
    expect(request.roles).not.toContain('POD_MANAGER');
  });

  it('reads a JWT signed with another secret as anonymous', () => {
    const { request } = describeRequest(requestWith({ authorization: jwtHeader(JWT_USER, `${SECRET}-forged`) }), 'REST');
    expect(request.userId).toBeUndefined();
    expect(request.roles).toEqual([]);
  });

  it('is anonymous with no Authorization header at all', () => {
    const { request, info } = describeRequest(requestWith({}), 'REST');
    expect(request.userId).toBeUndefined();
    expect(request.roles).toEqual([]);
    expect(info.userEmail).toBeUndefined();
  });

  it('reports no email for a verified user whose email is null', () => {
    const { request, info } = describeRequest(requestWith({}), 'GRAPHQL', { ...MCP_USER, email: null });
    expect(request.userId).toBe(MCP_USER.id);
    expect(info.userEmail).toBeUndefined();
  });
});

describe('describeRequest — what the request says about itself', () => {
  it('still reads channel, surface, app, ip, path, method, device and user agent from the request', () => {
    const req = requestWith(
      {
        authorization: 'Bearer dmcp_at_x',
        'x-duncit-surface': ' mweb ',
        [APP_HEADER]: 'MWeb',
        'x-duid': 'device-42',
        'user-agent': 'Claude-User/1.0',
      },
      { path: '/graphql', method: 'POST', ip: '198.51.100.9' }
    );
    const { request, info } = describeRequest(req, 'GRAPHQL', MCP_USER);
    expect(request).toEqual({
      channel: 'GRAPHQL',
      surface: 'MWEB',
      app: 'mweb',
      path: '/graphql',
      method: 'POST',
      ip: '198.51.100.9',
      userId: MCP_USER.id,
      roles: MCP_USER.roles,
      deviceId: 'device-42',
    });
    expect(info.userAgent).toBe('Claude-User/1.0');
  });

  it('files an x-api-key caller as the API surface and the public-api app, whatever it declares', () => {
    const req = requestWith({ 'x-api-key': 'dk_live_1', 'x-duncit-surface': 'MWEB', [APP_HEADER]: 'mweb' }, { path: '/v1/pods', method: 'GET' });
    const { request } = describeRequest(req, 'REST');
    expect(request.surface).toBe('API');
    expect(request.app).toBe('public-api');
    expect(request.channel).toBe('REST');
    expect(request.path).toBe('/v1/pods');
    expect(request.method).toBe('GET');
  });

  it('uses the first value when a proxy repeated a header, and ignores blank ones', () => {
    const req = requestWith({ 'x-duncit-surface': ['PORTAL', 'NATIVE'], [APP_HEADER]: '   ', 'x-duid': ['d-1', 'd-2'] });
    const { request, info } = describeRequest(req, 'GRAPHQL');
    expect(request.surface).toBe('PORTAL');
    expect(request.app).toBe('-');
    expect(request.deviceId).toBe('d-1');
    expect(info.userAgent).toBeUndefined();
  });

  it('reduces an unknown surface to UNKNOWN and an unusable app name to a dash', () => {
    const { request } = describeRequest(requestWith({ 'x-duncit-surface': 'toaster', [APP_HEADER]: '!!evil app' }), 'REST');
    expect(request.surface).toBe('UNKNOWN');
    expect(request.app).toBe('-');
  });

  it('records an empty address when the request has none', () => {
    const { request } = describeRequest(requestWith({}, { ip: undefined }), 'REST');
    expect(request.ip).toBe('');
  });
});
