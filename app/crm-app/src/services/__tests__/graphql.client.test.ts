import { ClientError } from 'graphql-request';
import { parse } from 'graphql';

import { resetTokenCache, setToken } from '@/services/session';
import { CLIENT_HEADERS, gqlRequest, isQuery, isTransient, toApiError } from '../graphql.client';

const mockRequest = jest.fn();
const mockConstruct = jest.fn();
jest.mock('graphql-request', () => {
  const actual = jest.requireActual('graphql-request');
  return {
    ...actual,
    GraphQLClient: jest.fn().mockImplementation((url: string, options: unknown) => {
      mockConstruct(url, options);
      return { request: mockRequest };
    }),
  };
});

/** The one door to the API: headers, token, retries for reads only, worded errors. */

const QUERY = parse('query Q { me { user_id } }') as never;
const MUTATION = parse('mutation M { logout }') as never;
const clientError = (status: number, message = 'bad', code = 'X') =>
  new ClientError({ status, errors: [{ message, extensions: { code } }] } as never, { query: '' });
const aborted = () => Object.assign(new Error('aborted'), { name: 'AbortError' });

beforeEach(() => {
  resetTokenCache();
  mockRequest.mockReset();
  mockConstruct.mockReset();
});

it('says it is the native CRM app on every request', () => {
  expect(CLIENT_HEADERS).toMatchObject({ 'x-duncit-surface': 'NATIVE', 'x-duncit-app': 'crm-app' });
});

it('tells queries from mutations', () => {
  expect(isQuery(QUERY)).toBe(true);
  expect(isQuery(MUTATION)).toBe(false);
});

it('retries only transport failures and 5xx', () => {
  expect(isTransient(new TypeError('Network request failed'))).toBe(true);
  expect(isTransient(clientError(503))).toBe(true);
  expect(isTransient(clientError(400))).toBe(false);
  expect(isTransient(aborted())).toBe(false);
});

it('words every failure for a person and keeps the server code', () => {
  expect(toApiError(aborted()).message).toBe('The request timed out. Please try again.');
  const mapped = toApiError(clientError(401, 'Not authenticated', 'UNAUTHENTICATED'));
  expect(mapped.message).toBe('Not authenticated');
  expect(mapped.code).toBe('UNAUTHENTICATED');
  expect(toApiError(new TypeError('x')).message).toBe(
    'Network error. Check your connection and try again.',
  );
});

it('says the server is busy for a gateway page with no GraphQL error, and "Request failed" otherwise', () => {
  const gateway = (status: number) =>
    new ClientError({ status, errors: undefined } as never, { query: '' });
  const busy = toApiError(gateway(502));
  expect(busy.message).toBe('Duncit is busy for a moment. Please try again.');
  expect(busy.status).toBe(502);
  expect(toApiError(gateway(413)).message).toBe('Request failed.');
});

it('posts to the API with the client headers and the session token', async () => {
  await setToken('tok-1');
  mockRequest.mockResolvedValue({ me: { user_id: 'u1' } });
  await expect(gqlRequest(QUERY)).resolves.toEqual({ me: { user_id: 'u1' } });
  const [url, options] = mockConstruct.mock.calls[0] as [
    string,
    { headers: Record<string, string> },
  ];
  expect(url).toMatch(/\/graphql$/);
  expect(options.headers).toMatchObject({ ...CLIENT_HEADERS, Authorization: 'Bearer tok-1' });
});

it('sends no token when asked not to, or a given one instead', async () => {
  await setToken('tok-1');
  mockRequest.mockResolvedValue({});
  await gqlRequest(QUERY, undefined, { auth: false });
  await gqlRequest(QUERY, undefined, { token: 'pending' });
  expect(
    (mockConstruct.mock.calls[0][1] as { headers: Record<string, string> }).headers.Authorization,
  ).toBeUndefined();
  expect(
    (mockConstruct.mock.calls[1][1] as { headers: Record<string, string> }).headers.Authorization,
  ).toBe('Bearer pending');
});

it('retries a read through a brief outage', async () => {
  mockRequest.mockRejectedValueOnce(new TypeError('down')).mockResolvedValueOnce({ ok: true });
  await expect(gqlRequest(QUERY, undefined, { auth: false })).resolves.toEqual({ ok: true });
  expect(mockRequest).toHaveBeenCalledTimes(2);
});

it('never repeats a write whose answer was lost', async () => {
  mockRequest.mockRejectedValue(new TypeError('down'));
  await expect(gqlRequest(MUTATION, undefined, { auth: false })).rejects.toThrow('Network error');
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

it('gives up on a GraphQL error at once, with its message', async () => {
  mockRequest.mockRejectedValue(clientError(200, 'Lead not found', 'NOT_FOUND'));
  await expect(gqlRequest(QUERY, undefined, { auth: false })).rejects.toThrow('Lead not found');
  expect(mockRequest).toHaveBeenCalledTimes(1);
});
