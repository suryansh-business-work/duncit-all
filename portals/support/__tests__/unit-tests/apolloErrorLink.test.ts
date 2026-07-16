import { describe, expect, it } from 'vitest';
import { ApolloLink, Observable, execute, gql } from '@apollo/client';
import { apolloErrorLink } from '@duncit/shell';

const QUERY = gql`
  query Probe {
    probe
  }
`;

function runWith(downstream: ApolloLink) {
  return new Promise<{ error?: Error; data?: unknown }>((resolve) => {
    execute(apolloErrorLink.concat(downstream), { query: QUERY }).subscribe({
      next: (data) => resolve({ data }),
      error: (error) => resolve({ error }),
      complete: () => resolve({}),
    });
  });
}

describe('apolloErrorLink', () => {
  it('rewrites a network "failed to fetch" error to a friendly message', async () => {
    const err = new Error('Failed to fetch');
    const downstream = new ApolloLink(() => new Observable((obs) => obs.error(err)));
    const { error } = await runWith(downstream);
    expect(error?.message).toMatch(/unable to connect to server/i);
  });

  it('leaves an unrelated network error message untouched', async () => {
    const err = new Error('Some other failure');
    const downstream = new ApolloLink(() => new Observable((obs) => obs.error(err)));
    const { error } = await runWith(downstream);
    expect(error?.message).toBe('Some other failure');
  });

  it('ignores GraphQL-only errors (no networkError present)', async () => {
    const downstream = new ApolloLink(
      () =>
        new Observable((obs) => {
          obs.next({ errors: [{ message: 'bad input' }] } as never);
          obs.complete();
        })
    );
    const { data } = await runWith(downstream);
    expect((data as { errors: { message: string }[] }).errors[0].message).toBe('bad input');
  });
});
