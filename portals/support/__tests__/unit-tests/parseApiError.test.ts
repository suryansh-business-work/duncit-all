import { describe, expect, it } from 'vitest';
import { parseApiError } from '@duncit/utils';

describe('parseApiError', () => {
  it('returns a generic message for nullish input', () => {
    expect(parseApiError(null)).toMatch(/something went wrong/i);
    expect(parseApiError(undefined)).toMatch(/something went wrong/i);
  });

  it('maps a fetch network failure to a connectivity message', () => {
    expect(parseApiError({ networkError: { message: 'Failed to fetch' } })).toMatch(/unable to connect/i);
    expect(parseApiError({ networkError: { message: 'Load failed' } })).toMatch(/unable to connect/i);
  });

  it('returns a plain network message for other network errors', () => {
    expect(parseApiError({ networkError: { message: 'ECONNRESET' } })).toMatch(/network error/i);
  });

  it('handles a network error with no message', () => {
    expect(parseApiError({ networkError: {} })).toMatch(/network error/i);
  });

  it('surfaces the first GraphQL error message', () => {
    expect(parseApiError({ graphQLErrors: [{ message: 'Invalid email or password' }] })).toBe(
      'Invalid email or password'
    );
  });

  it('maps a network-shaped plain message to the connectivity message', () => {
    expect(parseApiError({ message: 'Network request failed' })).toMatch(/unable to connect/i);
  });

  it('returns a non-network plain message verbatim', () => {
    expect(parseApiError({ message: 'Boom happened' })).toBe('Boom happened');
  });

  it('falls back to the generic message when nothing matches', () => {
    expect(parseApiError({})).toMatch(/something went wrong/i);
  });
});
