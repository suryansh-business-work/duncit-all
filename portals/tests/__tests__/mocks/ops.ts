import { vi } from 'vitest';

/**
 * Operation-keyed Apollo + dialog stand-ins for page-level specs.
 *
 * A page under test reads and writes by GraphQL operation NAME, so a spec seeds
 * `ops.q.<QueryName>` / `ops.mut.<MutationName>` and drives the real UI; the
 * page's hooks, tables and dialogs all run for real. Wire them with:
 *
 *   vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
 *   vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
 */
type QueryState = { data?: unknown; loading?: boolean; error?: Error; refetch?: () => Promise<unknown> };

export const ops = {
  q: {} as Record<string, QueryState>,
  mut: {} as Record<string, ReturnType<typeof vi.fn>>,
  mutLoading: {} as Record<string, boolean>,
  confirm: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  notify: vi.fn(),
  tableRows: [] as unknown[],
};

type Doc = { definitions: Array<{ name?: { value: string } }> };
const nameOf = (doc: Doc) => doc.definitions[0]?.name?.value ?? '';

/** Mutation spy for an operation, created on first use so tests can read it back. */
export const mutation = (name: string) => (ops.mut[name] ??= vi.fn().mockResolvedValue({ data: {} }));

export function resetOps() {
  ops.q = {};
  ops.mut = {};
  ops.mutLoading = {};
  ops.tableRows = [];
  ops.confirm.mockReset();
  ops.notifyError.mockReset();
  ops.notifySuccess.mockReset();
  ops.notify.mockReset();
}

export async function apolloOpsFactory(io: () => Promise<typeof import('@apollo/client/react')>) {
  const actual = await io();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useQuery: (doc: Doc) => ({ loading: false, refetch: () => Promise.resolve({}), ...ops.q[nameOf(doc)] }),
    useMutation: (doc: Doc) => [mutation(nameOf(doc)), { loading: ops.mutLoading[nameOf(doc)] ?? false }],
  };
}

export async function dialogsOpsFactory(io: () => Promise<typeof import('@duncit/dialogs')>) {
  const actual = await io();
  return {
    ...actual,
    useConfirm: () => ops.confirm,
    notifyError: ops.notifyError,
    notifySuccess: ops.notifySuccess,
    notify: ops.notify,
  };
}
