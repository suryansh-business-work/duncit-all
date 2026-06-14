import { describe, expect, it } from 'vitest';

import { parseApiError } from './parseApiError';

describe('parseApiError', () => {
  it('returns a generic message for a falsy error', () => {
    expect(parseApiError(null)).toMatch(/something went wrong/i);
  });

  it('maps connectivity network errors to a friendly message', () => {
    expect(parseApiError({ networkError: { message: 'Failed to fetch' } })).toMatch(
      /unable to connect/i,
    );
  });

  it('returns a generic network message for other network errors', () => {
    expect(parseApiError({ networkError: { message: 'boom' } })).toMatch(/network error/i);
    expect(parseApiError({ networkError: {} })).toMatch(/network error/i);
  });

  it('surfaces the first GraphQL error message', () => {
    expect(parseApiError({ graphQLErrors: [{ message: 'Invalid input' }] })).toBe('Invalid input');
  });

  it('maps a connectivity message string and passes other messages through', () => {
    expect(parseApiError({ message: 'Load failed' })).toMatch(/unable to connect/i);
    expect(parseApiError({ message: 'Email already used' })).toBe('Email already used');
  });

  it('falls back when the error carries no useful fields', () => {
    expect(parseApiError({})).toMatch(/something went wrong/i);
  });
});
