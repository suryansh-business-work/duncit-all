import { parse } from 'graphql';
import { ClientError } from 'graphql-request';

import { getAuthToken } from '@/services/auth-token';
import { graphqlRequest } from '@/services/graphql.client';
import { ApiError } from '@/utils/errors';

const mockRequest = jest.fn();
const ctorCalls: [string, { headers?: Record<string, string> }][] = [];

jest.mock('graphql-request', () => {
  const actual = jest.requireActual('graphql-request');
  return {
    __esModule: true,
    ClientError: actual.ClientError,
    GraphQLClient: jest
      .fn()
      .mockImplementation((url: string, opts: { headers?: Record<string, string> }) => {
        ctorCalls.push([url, opts]);
        return { request: mockRequest };
      }),
  };
});

jest.mock('@/services/auth-token');
const mockedGetToken = jest.mocked(getAuthToken);

const DOC = parse('query Test { __typename }') as never;

beforeEach(() => {
  jest.clearAllMocks();
  ctorCalls.length = 0;
});

describe('graphqlRequest', () => {
  it('returns data on a successful response', async () => {
    mockRequest.mockResolvedValue({ hello: 'world' });
    await expect(graphqlRequest(DOC)).resolves.toEqual({ hello: 'world' });
  });

  it('surfaces the first GraphQL error as an ApiError', async () => {
    mockRequest.mockRejectedValue(
      new ClientError(
        { status: 400, errors: [{ message: 'Email already in use' }] } as never,
        {
          query: 'q',
        } as never,
      ),
    );
    await expect(graphqlRequest(DOC)).rejects.toThrow('Email already in use');
  });

  it('wraps a network failure in a friendly ApiError', async () => {
    mockRequest.mockRejectedValue(new Error('boom'));
    await expect(graphqlRequest(DOC)).rejects.toThrow(/network error/i);
  });

  it('maps an aborted request to a timeout message', async () => {
    mockRequest.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(graphqlRequest(DOC)).rejects.toThrow(/timed out/i);
  });

  it('does not depend on the DOMException global (Hermes/RN has none)', async () => {
    const original = (global as { DOMException?: unknown }).DOMException;
    delete (global as { DOMException?: unknown }).DOMException;
    try {
      mockRequest.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      await expect(graphqlRequest(DOC)).rejects.toThrow(/timed out/i);
      mockRequest.mockRejectedValue(new Error('Network request failed'));
      await expect(graphqlRequest(DOC)).rejects.toBeInstanceOf(ApiError);
    } finally {
      (global as { DOMException?: unknown }).DOMException = original;
    }
  });

  it('attaches the bearer token when auth is requested', async () => {
    mockedGetToken.mockResolvedValue('jwt-123');
    mockRequest.mockResolvedValue({});
    await graphqlRequest(DOC, undefined, { auth: true });
    expect(ctorCalls[0]?.[1].headers?.Authorization).toBe('Bearer jwt-123');
  });

  it('omits the auth header when no token is stored', async () => {
    mockedGetToken.mockResolvedValue(null);
    mockRequest.mockResolvedValue({});
    await graphqlRequest(DOC, undefined, { auth: true });
    expect(ctorCalls[0]?.[1].headers?.Authorization).toBeUndefined();
  });
});
