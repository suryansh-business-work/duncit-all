import { describe, expect, it } from 'vitest';
import {
  GENERIC_ERROR_MESSAGE,
  OFFLINE_MESSAGE,
  isNetworkFailureMessage,
  parseApiError,
} from '../src/parse-api-error';

describe('parseApiError', () => {
  it('returns the fallback for nullish input', () => {
    expect(parseApiError(null)).toBe(GENERIC_ERROR_MESSAGE);
    expect(parseApiError(undefined)).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('honors a custom fallback for nullish and empty errors', () => {
    expect(parseApiError(null, 'Custom')).toBe('Custom');
    expect(parseApiError({}, 'Custom')).toBe('Custom');
  });

  it('maps a connectivity networkError to a friendly message', () => {
    expect(parseApiError({ networkError: { message: 'Failed to fetch' } })).toBe(OFFLINE_MESSAGE);
  });

  it('maps a generic networkError to a network message', () => {
    expect(parseApiError({ networkError: { message: 'boom' } })).toMatch(/network error/i);
    // networkError present but message undefined → still "Network error"
    expect(parseApiError({ networkError: {} })).toMatch(/network error/i);
  });

  it('returns the first GraphQL error message', () => {
    expect(parseApiError({ graphQLErrors: [{ message: 'Bad input' }, { message: 'second' }] })).toBe(
      'Bad input',
    );
  });

  it('falls through empty graphQLErrors to the plain message', () => {
    expect(parseApiError({ graphQLErrors: [], message: 'Nope' })).toBe('Nope');
  });

  it('detects connectivity wording inside a plain message', () => {
    expect(parseApiError({ message: 'Load failed' })).toBe(OFFLINE_MESSAGE);
    expect(parseApiError({ message: 'Network request failed' })).toBe(OFFLINE_MESSAGE);
  });

  it('passes a plain message through', () => {
    expect(parseApiError({ message: 'Nope' })).toBe('Nope');
  });

  it('falls back when the error object is empty', () => {
    expect(parseApiError({})).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('reads the message off a real Error instance', () => {
    expect(parseApiError(new Error('Boom'))).toBe('Boom');
    expect(parseApiError(new TypeError('Failed to fetch'))).toBe(OFFLINE_MESSAGE);
  });

  it('ranks networkError above graphQLErrors and message', () => {
    expect(
      parseApiError({
        networkError: { message: 'Failed to fetch' },
        graphQLErrors: [{ message: 'Bad input' }],
        message: 'plain',
      }),
    ).toBe(OFFLINE_MESSAGE);
  });

  it('ranks graphQLErrors above the plain message', () => {
    expect(parseApiError({ graphQLErrors: [{ message: 'Bad input' }], message: 'plain' })).toBe(
      'Bad input',
    );
  });

  it('ignores a null networkError and falls through', () => {
    expect(parseApiError({ networkError: null, message: 'Nope' })).toBe('Nope');
    expect(parseApiError({ networkError: null })).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('falls back for an empty-string message rather than rendering nothing', () => {
    expect(parseApiError({ message: '' })).toBe(GENERIC_ERROR_MESSAGE);
    expect(parseApiError({ message: '' }, 'Custom')).toBe('Custom');
  });

  it('falls back for falsy non-object errors', () => {
    expect(parseApiError(0, 'Custom')).toBe('Custom');
    expect(parseApiError('', 'Custom')).toBe('Custom');
    expect(parseApiError(false, 'Custom')).toBe('Custom');
  });

  it('falls back for a bare string error — it carries no .message', () => {
    expect(parseApiError('Boom')).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe('isNetworkFailureMessage', () => {
  it('matches known fetch-failure wordings case-insensitively', () => {
    expect(isNetworkFailureMessage('Failed to fetch')).toBe(true);
    expect(isNetworkFailureMessage('NETWORK REQUEST FAILED')).toBe(true);
    expect(isNetworkFailureMessage('Load failed')).toBe(true);
  });

  it('does not match unrelated messages', () => {
    expect(isNetworkFailureMessage('Unauthorized')).toBe(false);
  });
});
