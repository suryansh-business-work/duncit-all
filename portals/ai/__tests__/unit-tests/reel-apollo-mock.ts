import type { DocumentNode } from 'graphql';
import { vi, type Mock } from 'vitest';

/**
 * Apollo's two hooks, answered from a table the test fills in.
 *
 * Reel Studio's screens are a dozen small hooks that each fire one document.
 * What needs proving is what each does with the answer — close the dialog, say
 * so, refetch — not Apollo's cache, and a `MockedProvider` response has to
 * restate every selected field with its `__typename` to be accepted at all.
 * Here a test names the document and hands back the data or the failure.
 *
 * Wire it in with:
 *   vi.mock('@apollo/client/react', async (io) => ({ ...(await io()), ...(await import('./reel-apollo-mock')).hooks }));
 */

interface QueryAnswer {
  data?: unknown;
  loading?: boolean;
  error?: Error;
  refetch?: Mock;
}

type Mutate = (options?: { variables?: Record<string, unknown> }) => Promise<unknown>;

const queries = new Map<DocumentNode, QueryAnswer>();
const mutations = new Map<DocumentNode, Mock<Mutate>>();
const busy = new Set<DocumentNode>();

/** The options each `useQuery` was last called with — its variables, and whether it was skipped. */
export const queryOptions = new Map<DocumentNode, { variables?: Record<string, unknown>; skip?: boolean } | undefined>();

/** Answer a query. Returns the `refetch` it will hand out, so a test can assert on it or make it fail. */
export function answerQuery(document: DocumentNode, answer: QueryAnswer = {}): Mock {
  const refetch = answer.refetch ?? vi.fn(async () => ({}));
  queries.set(document, { ...answer, refetch });
  return refetch;
}

/** The function a mutation hook hands out. Resolves with empty data unless given something else to do. */
export function mutationOf(document: DocumentNode): Mock<Mutate> {
  let mutate = mutations.get(document);
  if (!mutate) {
    mutate = vi.fn<Mutate>(async () => ({ data: {} }));
    mutations.set(document, mutate);
  }
  return mutate;
}

/** Mark a mutation as in flight, as its hook reports while the request is out. */
export function setMutationBusy(document: DocumentNode, isBusy: boolean): void {
  if (isBusy) busy.add(document);
  else busy.delete(document);
}

export function resetApollo(): void {
  queries.clear();
  mutations.clear();
  busy.clear();
  queryOptions.clear();
}

export const hooks = {
  useQuery: (document: DocumentNode, options?: { variables?: Record<string, unknown>; skip?: boolean }) => {
    queryOptions.set(document, options);
    const answer = queries.get(document) ?? {};
    const refetch = answer.refetch ?? answerQuery(document, answer);
    if (options?.skip) return { data: undefined, loading: false, error: undefined, refetch };
    return { data: answer.data, loading: answer.loading ?? false, error: answer.error, refetch };
  },
  useMutation: (document: DocumentNode) => [mutationOf(document), { loading: busy.has(document) }],
};
