import { ApiError, toErrorMessage } from '@/utils/errors';

describe('toErrorMessage', () => {
  it('returns the message from an Error', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns a non-empty string as-is', () => {
    expect(toErrorMessage('plain failure')).toBe('plain failure');
  });

  it('falls back for empty or unknown values', () => {
    expect(toErrorMessage('')).toBe('Something went wrong.');
    expect(toErrorMessage(null)).toBe('Something went wrong.');
    expect(toErrorMessage({}, 'custom fallback')).toBe('custom fallback');
  });
});

describe('ApiError', () => {
  it('carries a message and optional status', () => {
    const error = new ApiError('not found', 404);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(404);
  });
});
