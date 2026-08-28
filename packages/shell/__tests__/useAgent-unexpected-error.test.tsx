/**
 * useAgent's own send() wrapper catches a turn that throws synchronously,
 * rather than an uncaught rejection — run() itself never throws in the
 * normal flow (its own mutation failure is already caught), so this is the
 * genuinely-unexpected case the wrapper's comment names. Reaching it needs
 * the mutate function itself to throw, which only a mocked useMutation can
 * arrange — kept in its own file so the mock does not affect useAgent's
 * other tests, which need the real hook.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useMutation: () => [
    () => {
      throw new Error('the mutate call itself blew up');
    },
    { loading: false },
  ],
}));

import { useAgent } from '../src/chrome/agent/useAgent';

describe('useAgent send()', () => {
  it('catches a turn that throws unexpectedly, rather than an uncaught rejection', async () => {
    const { result } = renderHook(() => useAgent());

    act(() => {
      result.current.send('hello');
    });

    await waitFor(() => expect(result.current.error).toBe(true));
  });
});
