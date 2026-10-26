import { describe, expect, it } from 'vitest';
import { consentErrorKey } from '../../../src/pages/connect/queries';

/** A GraphQL failure the way Apollo 4 throws it (CombinedGraphQLErrors). */
const graphqlError = (code: string) => ({ errors: [{ message: 'refused', extensions: { code } }] });

describe('consentErrorKey', () => {
  it('reads an expired request (NOT_FOUND) as expired', () => {
    expect(consentErrorKey(graphqlError('NOT_FOUND'))).toBe('mcp.consent.expired');
  });

  it('reads a request someone already answered (CONFLICT) as answered', () => {
    expect(consentErrorKey(graphqlError('CONFLICT'))).toBe('mcp.consent.answered');
  });

  it('reads a refusal to approve (FORBIDDEN) as no MCP access', () => {
    expect(consentErrorKey(graphqlError('FORBIDDEN'))).toBe('mcp.consent.cannotApprove');
  });

  it('also reads the Apollo 3 shape the shared helper accepts', () => {
    expect(consentErrorKey({ graphQLErrors: [{ message: 'gone', extensions: { code: 'NOT_FOUND' } }] })).toBe(
      'mcp.consent.expired',
    );
  });

  it('leaves every other failure to the caller', () => {
    expect(consentErrorKey(graphqlError('INTERNAL_SERVER_ERROR'))).toBeNull();
    expect(consentErrorKey(new Error('Failed to fetch'))).toBeNull();
    expect(consentErrorKey(undefined)).toBeNull();
  });
});
