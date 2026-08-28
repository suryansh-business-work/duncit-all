/**
 * One conversation with one bot — `send` is synchronous by design, so a
 * genuinely unexpected throw from `run` (not the ordinary "the mutation
 * rejected" case, which `run` already handles) still has to land somewhere
 * rather than becoming an unhandled rejection.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useMutation: () => [
    () => {
      throw new Error('client misconfigured');
    },
    { loading: false },
  ],
}));

import { useAskBot } from '../src/chrome/ask-bot/useAskBot';

describe('useAskBot', () => {
  it('reports the turn as failed rather than leaving an unhandled rejection', async () => {
    const { result } = renderHook(() => useAskBot('navigation'));

    expect(() => {
      act(() => {
        result.current.send('where do I add a venue?');
      });
    }).not.toThrow();

    await waitFor(() => expect(result.current.error).toBe(true));
  });
});
