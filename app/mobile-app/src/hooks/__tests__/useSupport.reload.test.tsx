import { renderHook, waitFor } from '@testing-library/react-native';

import { useTickets } from '@/hooks/useSupport';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const request = graphqlRequest as jest.Mock;

/**
 * `reload` must keep the SAME identity across renders.
 *
 * `MyTicketsList` passes it to `useFocusEffect` as a dependency. When a fresh
 * arrow function was returned on every render, every reload re-rendered, minted
 * a new `reload`, re-ran the focus effect and reloaded again — about 35,000
 * requests until the browser ran out of sockets, which took every other query
 * on the page down with it.
 *
 * The list's own test mocks `useFocusEffect` as `(cb) => cb()`, which runs the
 * callback once whatever its identity, so it could never have caught this.
 * Identity is the thing to assert.
 */
describe('useTickets reload identity', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ myTickets: [] });
  });

  it('is the same function across renders, so an effect depending on it settles', async () => {
    const { result, rerender } = renderHook(() => useTickets());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    const first = result.current.reload;
    rerender({});
    rerender({});

    expect(result.current.reload).toBe(first);
  });

  it('reloading once fetches once — not once per resulting render', async () => {
    const { result } = renderHook(() => useTickets());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    result.current.reload();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));

    // Settle, then confirm nothing kept firing on its own.
    await new Promise((r) => setTimeout(r, 50));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('re-running the focus effect on every render cannot loop', async () => {
    // Exactly what MyTicketsList does: call reload whenever its identity
    // changes. With a stable reload this runs once; with the old one it never
    // stopped.
    const { result, rerender } = renderHook(() => {
      const tickets = useTickets();
      return tickets;
    });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    const seen = new Set<unknown>();
    for (let i = 0; i < 5; i += 1) {
      seen.add(result.current.reload);
      rerender({});
    }
    expect(seen.size).toBe(1);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
