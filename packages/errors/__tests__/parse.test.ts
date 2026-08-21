import { describe, expect, it } from 'vitest';

import { parseIssue } from '../src/parse';

const FALLBACK = 'Fallback copy from the caller.';

describe('parseIssue — GraphQL errors from Apollo', () => {
  it('maps a known extensions.code to its behaviour kind and keeps the server message', () => {
    const issue = parseIssue(
      {
        graphQLErrors: [
          {
            message: '  You already hold a seat in this pod.  ',
            path: ['joinPod', 'ticket'],
            extensions: { code: 'ALREADY_BOOKED' },
          },
        ],
      },
      { operation: 'JoinPod', fallbackMessage: FALLBACK }
    );

    expect(issue).toEqual({
      kind: 'CONFLICT',
      code: 'ALREADY_BOOKED',
      message: 'You already hold a seat in this pod.',
      operation: 'JoinPod',
      path: 'joinPod.ticket',
      offerReport: true,
    });
  });

  it('does not offer a report for a validation refusal — the input is the caller\u2019s to fix', () => {
    const issue = parseIssue({
      graphQLErrors: [{ message: 'Add a billing address.', extensions: { code: 'BAD_USER_INPUT' } }],
    });

    expect(issue.kind).toBe('VALIDATION');
    expect(issue.offerReport).toBe(false);
  });

  it('treats an unrecognised code as SERVER rather than guessing', () => {
    const issue = parseIssue({
      graphQLErrors: [{ message: 'boom', extensions: { code: 'SOMETHING_NEW' } }],
    });

    expect(issue.kind).toBe('SERVER');
    expect(issue.code).toBe('SOMETHING_NEW');
    expect(issue.offerReport).toBe(true);
  });

  it('falls back to the caller copy when the GraphQL error carries no message, and nulls a missing code/path', () => {
    const issue = parseIssue({ graphQLErrors: [{ extensions: null }] }, { fallbackMessage: FALLBACK });

    expect(issue).toEqual({
      kind: 'SERVER',
      code: null,
      message: FALLBACK,
      operation: null,
      path: null,
      offerReport: true,
    });
  });

  it('nulls a blank code string rather than keeping an empty key', () => {
    const issue = parseIssue({ graphQLErrors: [{ message: 'x', extensions: { code: '   ' } }] });

    expect(issue.code).toBeNull();
    expect(issue.kind).toBe('SERVER');
  });

  it('ignores an empty graphQLErrors array and reads the error itself', () => {
    const issue = parseIssue({ graphQLErrors: [], message: 'plain failure' });

    expect(issue.kind).toBe('UNKNOWN');
    expect(issue.message).toBe('plain failure');
  });
});

describe('parseIssue — the native ApiError shape', () => {
  it('reads extensions.code carried directly on the thrown error', () => {
    const issue = parseIssue(
      { message: 'Sign in again.', extensions: { code: 'UNAUTHENTICATED' }, path: ['me'] },
      { operation: 'Me' }
    );

    expect(issue).toEqual({
      kind: 'AUTH',
      code: 'UNAUTHENTICATED',
      message: 'Sign in again.',
      operation: 'Me',
      path: 'me',
      offerReport: true,
    });
  });

  it('falls back to a top-level `code` and a string path', () => {
    const issue = parseIssue({ code: 'NOT_FOUND', path: 'pod.slug', message: 'No such pod.' });

    expect(issue.kind).toBe('NOT_FOUND');
    expect(issue.path).toBe('pod.slug');
  });

  it('nulls a non-string, non-array path', () => {
    const issue = parseIssue({ code: 'CONFLICT', path: 42 });

    expect(issue.path).toBeNull();
    expect(issue.message).toBe('Something went wrong. Please try again.');
  });

  it('maps an unknown direct code to SERVER', () => {
    expect(parseIssue({ code: 'WAT' }).kind).toBe('SERVER');
  });
});

describe('parseIssue — transport failures', () => {
  it('replaces a networkError\u2019s jargon with the caller copy', () => {
    const issue = parseIssue(
      { networkError: { message: 'TypeError: Failed to fetch' } },
      { fallbackMessage: FALLBACK }
    );

    expect(issue).toEqual({
      kind: 'NETWORK',
      code: null,
      message: FALLBACK,
      operation: null,
      path: null,
      offerReport: true,
    });
  });

  it.each([
    'Failed to fetch',
    'Network request failed',
    'Load failed',
    'NetworkError when attempting to fetch resource.',
  ])('recognises %j as a transport failure even with no networkError field', (message) => {
    expect(parseIssue({ message }).kind).toBe('NETWORK');
  });
});

describe('parseIssue — anything else', () => {
  it('returns UNKNOWN with the raw message when there is one', () => {
    expect(parseIssue({ message: 'Unhandled thing' })).toEqual({
      kind: 'UNKNOWN',
      code: null,
      message: 'Unhandled thing',
      operation: null,
      path: null,
      offerReport: true,
    });
  });

  it.each([[null], [undefined], [{}], ['a string throw'], [{ message: 7 }]])(
    'survives %j and uses the default copy',
    (thrown) => {
      const issue = parseIssue(thrown);

      expect(issue.kind).toBe('UNKNOWN');
      expect(issue.message).toBe('Something went wrong. Please try again.');
    }
  );
});
