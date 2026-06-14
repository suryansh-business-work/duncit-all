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
const MUTATION_DOC = parse('mutation Do { __typename }') as never;
// A leading fragment definition exercises the non-operation branch of isQuery.
const FRAGMENT_DOC = parse('fragment F on Query { __typename } query WithFrag { ...F }') as never;

beforeEach(() => {
  jest.clearAllMocks();
  ctorCalls.length = 0;
});

afterEach(() => jest.useRealTimers());

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

  it('falls back to a generic message when a ClientError carries no errors', async () => {
    // A 5xx is transient, so a query retries up to the cap before surfacing it.
    mockRequest.mockRejectedValue(
      new ClientError({ status: 500, errors: undefined } as never, { query: 'q' } as never),
    );
    await expect(graphqlRequest(DOC)).rejects.toThrow('Request failed.');
    expect(mockRequest).toHaveBeenCalledTimes(3);
  });

  it('retries a transient query failure and resolves on a later attempt', async () => {
    mockRequest
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce({ ok: true });
    await expect(graphqlRequest(DOC)).resolves.toEqual({ ok: true });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('detects the query operation even when a fragment is defined first', async () => {
    mockRequest
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce({ ok: true });
    await expect(graphqlRequest(FRAGMENT_DOC)).resolves.toEqual({ ok: true });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('never retries a mutation, even on a transient failure', async () => {
    mockRequest.mockRejectedValue(new Error('Network request failed'));
    await expect(graphqlRequest(MUTATION_DOC)).rejects.toThrow(/network error/i);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 4xx GraphQL error and surfaces it at once', async () => {
    mockRequest.mockRejectedValue(
      new ClientError(
        { status: 400, errors: [{ message: 'Bad input' }] } as never,
        { query: 'q' } as never,
      ),
    );
    await expect(graphqlRequest(DOC)).rejects.toThrow('Bad input');
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('treats a non-Error rejection as a transient transport failure', async () => {
    mockRequest.mockRejectedValue('weird failure');
    await expect(graphqlRequest(DOC)).rejects.toThrow(/network error/i);
    expect(mockRequest).toHaveBeenCalledTimes(3);
  });

  it('fires the timeout guard and maps the abort to a timeout error', async () => {
    jest.useFakeTimers();
    let rejectRequest: (error: unknown) => void = () => undefined;
    mockRequest.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );

    const promise = graphqlRequest(DOC);
    jest.runOnlyPendingTimers(); // fires the timeout → controller.abort()
    rejectRequest(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    await expect(promise).rejects.toThrow(/timed out/i);
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
