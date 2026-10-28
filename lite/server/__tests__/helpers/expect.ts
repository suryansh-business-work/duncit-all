import { expect } from 'vitest';

/** The error a synchronous call throws, so a test can assert its message and GraphQL code. */
export function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw, but it returned');
}

/** The shape every GraphQL error the API raises carries: its message and its `extensions.code`. */
export const apiError = (code: string, message: string | RegExp) => ({
  message: typeof message === 'string' ? message : expect.stringMatching(message),
  extensions: expect.objectContaining({ code }),
});

export const badInputError = (message: string | RegExp) => apiError('BAD_USER_INPUT', message);
