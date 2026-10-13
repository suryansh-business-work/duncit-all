import type { DocumentNode } from 'graphql';
import { vi, type Mock } from 'vitest';

/**
 * Apollo's hooks answered from a table the test fills in: a test names the
 * document and hands back the data or the failure, and asserts on the
 * variables each mutation was sent. Wire in with:
 *   vi.mock('@apollo/client/react', async (io) => ({ ...(await io()), ...(await import('../hooks-mock')).hooks }));
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
const lazies = new Map<DocumentNode, Mock<Mutate>>();

/** The options each `useQuery` was last called with. */
export const queryOptions = new Map<DocumentNode, { variables?: Record<string, unknown>; skip?: boolean } | undefined>();

export function answerQuery(document: DocumentNode, answer: QueryAnswer = {}): Mock {
  const refetch = answer.refetch ?? vi.fn(async () => ({}));
  queries.set(document, { ...answer, refetch });
  return refetch;
}

export function mutationOf(document: DocumentNode): Mock<Mutate> {
  let mutate = mutations.get(document);
  if (!mutate) {
    mutate = vi.fn<Mutate>(async () => ({ data: {} }));
    mutations.set(document, mutate);
  }
  return mutate;
}

/** The function a lazy-query hook hands out; resolves with empty data unless told otherwise. */
export function lazyOf(document: DocumentNode): Mock<Mutate> {
  let run = lazies.get(document);
  if (!run) {
    run = vi.fn<Mutate>(async () => ({ data: undefined }));
    lazies.set(document, run);
  }
  return run;
}

export const setMutationBusy = (document: DocumentNode, isBusy: boolean) => (isBusy ? busy.add(document) : busy.delete(document));

export function resetApollo(): void {
  queries.clear();
  mutations.clear();
  busy.clear();
  lazies.clear();
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
  useLazyQuery: (document: DocumentNode) => [lazyOf(document), { loading: false }],
  useMutation: (document: DocumentNode) => [mutationOf(document), { loading: busy.has(document) }],
};
