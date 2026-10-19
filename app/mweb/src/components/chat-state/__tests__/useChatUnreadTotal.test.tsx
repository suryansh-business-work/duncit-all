import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { describe, expect, it } from 'vitest';
import { CHAT_UNREAD_TOTAL } from '../queries';
import { announceChatRead } from '../chatAlerts';
import { useChatUnreadTotal } from '../useChatUnreadTotal';

const total = (n: number) => ({
  request: { query: CHAT_UNREAD_TOTAL },
  result: { data: { chatUnreadTotal: n } },
});

const wrapper =
  (mocks: unknown[]) =>
  ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as never}>
      {children}
    </MockedProvider>
  );

describe('useChatUnreadTotal', () => {
  it('reads the total, and reads it again once a room is read', async () => {
    const { result } = renderHook(() => useChatUnreadTotal(), { wrapper: wrapper([total(4), total(1)]) });
    await waitFor(() => expect(result.current).toBe(4));
    act(() => announceChatRead());
    await waitFor(() => expect(result.current).toBe(1));
  });

  it('is 0 and asks nothing while disabled (signed out)', () => {
    const { result } = renderHook(() => useChatUnreadTotal(false), { wrapper: wrapper([]) });
    expect(result.current).toBe(0);
  });
});
