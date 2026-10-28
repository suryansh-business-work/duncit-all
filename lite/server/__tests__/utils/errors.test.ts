import { describe, expect, it } from 'vitest';
import { GraphQLError } from 'graphql';
import { badInput, configError, forbidden, notFound, unauthenticated, upstreamError } from '../../utils/errors';

describe('API errors', () => {
  it('carry the code the clients branch on and the message given', () => {
    const cases: [GraphQLError, string, string][] = [
      [badInput('Pick a ticket type'), 'BAD_USER_INPUT', 'Pick a ticket type'],
      [configError('Google sign-in is not configured'), 'CONFIG_ERROR', 'Google sign-in is not configured'],
      [upstreamError('ImageKit upload failed'), 'UPSTREAM_ERROR', 'ImageKit upload failed'],
      [unauthenticated('Your session has ended'), 'UNAUTHENTICATED', 'Your session has ended'],
      [forbidden('Only a host can do that'), 'FORBIDDEN', 'Only a host can do that'],
    ];
    for (const [error, code, message] of cases) {
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.message).toBe(message);
      expect(error.extensions.code).toBe(code);
    }
  });

  it('have readable defaults', () => {
    expect(unauthenticated().message).toBe('Please sign in to continue');
    expect(forbidden().message).toBe('You do not have access to this');
    expect(notFound().message).toBe('This could not be found');
  });

  it('name what could not be found', () => {
    const error = notFound('Event');
    expect(error.message).toBe('Event could not be found');
    expect(error.extensions.code).toBe('NOT_FOUND');
  });
});
