import { describe, expect, it } from 'vitest';
import { parseApiError } from './parseApiError';

describe('parseApiError', () => {
  it('returns the fallback for nullish input', () => {
    expect(parseApiError(null)).toMatch(/something went wrong/i);
    expect(parseApiError(undefined)).toMatch(/something went wrong/i);
  });

  it('maps a connectivity networkError to a friendly message', () => {
    expect(parseApiError({ networkError: { message: 'Failed to fetch' } })).toMatch(/unable to connect/i);
  });

  it('maps a generic networkError to a network message', () => {
    expect(parseApiError({ networkError: { message: 'boom' } })).toMatch(/network error/i);
    // networkError present but message undefined → still "Network error"
    expect(parseApiError({ networkError: {} })).toMatch(/network error/i);
  });

  it('returns the first GraphQL error message', () => {
    expect(parseApiError({ graphQLErrors: [{ message: 'Bad input' }, { message: 'second' }] })).toBe('Bad input');
  });

  it('detects connectivity wording inside a plain message', () => {
    expect(parseApiError({ message: 'Load failed' })).toMatch(/unable to connect/i);
  });

  it('passes a plain message through', () => {
    expect(parseApiError({ message: 'Nope' })).toBe('Nope');
  });

  it('falls back when the error object is empty', () => {
    expect(parseApiError({})).toMatch(/something went wrong/i);
  });
});
