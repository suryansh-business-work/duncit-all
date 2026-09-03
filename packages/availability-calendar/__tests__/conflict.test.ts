import { describe, expect, it } from 'vitest';
import { isSlotConflictError } from '../src/conflict';

describe('isSlotConflictError', () => {
  it('recognises only a GraphQL error carrying the CONFLICT code', () => {
    expect(isSlotConflictError({ graphQLErrors: [{ extensions: { code: 'CONFLICT' } }] })).toBe(true);
    expect(
      isSlotConflictError({ graphQLErrors: [{ extensions: { code: 'FORBIDDEN' } }, { extensions: { code: 'CONFLICT' } }] }),
    ).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a plain Error', new Error('boom')],
    ['a string', 'boom'],
    ['an empty error list', { graphQLErrors: [] }],
    ['another code', { graphQLErrors: [{ extensions: { code: 'BAD_USER_INPUT' } }] }],
    ['an error without extensions', { graphQLErrors: [{}] }],
  ])('is false for %s', (_label, error) => {
    expect(isSlotConflictError(error)).toBe(false);
  });
});
