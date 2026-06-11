import { describe, expect, it } from 'vitest';
import { parseApiError } from './parseApiError';

describe('parseApiError', () => {
  it('returns a generic message for falsy errors', () => {
    expect(parseApiError(null)).toMatch(/something went wrong/i);
  });

  it('maps a connectivity network error', () => {
    expect(parseApiError({ networkError: { message: 'Failed to fetch' } })).toMatch(
      /unable to connect/i,
    );
  });

  it('returns a generic network message for other network errors', () => {
    expect(parseApiError({ networkError: { message: 'boom' } })).toMatch(/network error/i);
    expect(parseApiError({ networkError: {} })).toMatch(/network error/i);
  });

  it('returns the first GraphQL error message', () => {
    expect(parseApiError({ graphQLErrors: [{ message: 'Venue not found' }] })).toBe(
      'Venue not found',
    );
  });

  it('maps a connectivity message and passes through other messages', () => {
    expect(parseApiError({ message: 'Load failed' })).toMatch(/unable to connect/i);
    expect(parseApiError({ message: 'Custom failure' })).toBe('Custom failure');
  });

  it('falls back when the error has no usable fields', () => {
    expect(parseApiError({})).toMatch(/something went wrong/i);
  });
});
