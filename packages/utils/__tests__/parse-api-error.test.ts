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
