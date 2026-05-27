import { describe, expect, it } from 'vitest';
import { parseApiError } from '@/utils/parseApiError';

describe('parseApiError', () => {
  it('handles null / undefined with the generic fallback', () => {
    expect(parseApiError(null)).toMatch(/something went wrong/i);
    expect(parseApiError(undefined)).toMatch(/something went wrong/i);
  });

  it('maps a "failed to fetch" networkError to the connectivity message', () => {
    const err = { networkError: { message: 'Failed to fetch' } };
    expect(parseApiError(err)).toMatch(/unable to connect/i);
  });

  it('falls back to a generic network message for other networkErrors', () => {
    const err = { networkError: { message: '500 Internal Server Error' } };
    expect(parseApiError(err)).toMatch(/network error/i);
  });

  it('treats a networkError with no message as a generic network failure', () => {
    expect(parseApiError({ networkError: {} })).toMatch(/network error/i);
  });

  it('returns the first GraphQL error message when present', () => {
    const err = { graphQLErrors: [{ message: 'Access denied' }, { message: 'second' }] };
    expect(parseApiError(err)).toBe('Access denied');
  });

  it('detects "failed to fetch" inside a top-level message', () => {
    const err = { message: 'Load failed' };
    expect(parseApiError(err)).toMatch(/unable to connect/i);
  });

  it('passes through a non-network top-level message verbatim', () => {
    const err = { message: 'Validation failed' };
    expect(parseApiError(err)).toBe('Validation failed');
  });

  it('returns the generic fallback when the error object has no useful fields', () => {
    expect(parseApiError({})).toMatch(/something went wrong/i);
  });
});
