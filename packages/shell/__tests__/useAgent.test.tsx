/**
 * One conversation with the Agent — the local turn-taking, the request
 * ignored while empty or mid-flight, and the two distinct places a failure
 * can come from: the mutation itself, and the "should never happen" throw
 * the send() wrapper still guards against.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { useAgent } from '../src/chrome/agent/useAgent';
import { AGENT_CHAT, type AgentReply } from '../src/chrome/agent/queries';

const REPLY: AgentReply = {
  answer: 'Created Sunday Badminton.',
  action: 'CREATE_POD',
  requested: 1,
  created: 1,
  failed: 0,
  items: [{ kind: 'pod', ok: true, id: 'p1', ref: 'DUN-POD-1', title: 'Sunday Badminton', detail: 'Created', when: null }],
};

const chatMock = (message: string, over: Partial<MockedResponse> = {}): MockedResponse =>
  ({
    request: { query: AGENT_CHAT, variables: { input: { message, history: [] } } },
    result: { data: { agentChat: REPLY } },
    ...over,
  }) as MockedResponse;

const wrapper = (mocks: readonly MockedResponse[]) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MockedProvider mocks={[...mocks]}>{children}</MockedProvider>;
  };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAgent', () => {
  it('ignores a blank or whitespace-only request', () => {
    const { result } = renderHook(() => useAgent(), { wrapper: wrapper([]) });

    act(() => {
      result.current.send('   ');
    });

    expect(result.current.messages).toEqual([]);
  });

  it('sends a request and appends the reply once it comes back', async () => {
    const { result } = renderHook(() => useAgent(), { wrapper: wrapper([chatMock('Book Sunday Badminton')]) });

    act(() => {
      result.current.send('Book Sunday Badminton');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ role: 'USER', content: 'Book Sunday Badminton' });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[1]).toMatchObject({
      role: 'AGENT',
      content: REPLY.answer,
      items: REPLY.items,
    });
    expect(result.current.error).toBe(false);
  });

  it('carries the earlier turns as history on the next request, text only', async () => {
    const mocks: MockedResponse[] = [
      chatMock('Book Sunday Badminton'),
      {
        request: {
          query: AGENT_CHAT,
          variables: {
            input: {
              message: 'And a court for Tuesday too',
              history: [
                { role: 'USER', content: 'Book Sunday Badminton' },
                { role: 'AGENT', content: REPLY.answer },
              ],
            },
          },
        },
        result: { data: { agentChat: { ...REPLY, answer: 'Created Tuesday too.' } } },
      },
    ];
    const { result } = renderHook(() => useAgent(), { wrapper: wrapper(mocks) });

    act(() => {
      result.current.send('Book Sunday Badminton');
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    act(() => {
      result.current.send('And a court for Tuesday too');
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(4));
    expect(result.current.messages[3]).toMatchObject({ content: 'Created Tuesday too.' });
  });

  it('ignores a second request while the first is still in flight', async () => {
    const mocks = [chatMock('first', { delay: 50 })];
    const { result } = renderHook(() => useAgent(), { wrapper: wrapper(mocks) });

    act(() => {
      result.current.send('first');
    });
    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.send('second, while still loading');
    });

    // Only the first turn's own USER message ever got appended.
    expect(result.current.messages).toHaveLength(1);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('reports an error when the mutation itself fails, without adding a reply', async () => {
    const mocks = [chatMock('will fail', { result: undefined, error: new Error('offline') })];
    const { result } = renderHook(() => useAgent(), { wrapper: wrapper(mocks) });

    act(() => {
      result.current.send('will fail');
    });

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.messages).toHaveLength(1);
  });

  it('dismisses the error banner without touching the thread', async () => {
    const mocks = [chatMock('will fail', { result: undefined, error: new Error('offline') })];
    const { result } = renderHook(() => useAgent(), { wrapper: wrapper(mocks) });
    act(() => {
      result.current.send('will fail');
    });
    await waitFor(() => expect(result.current.error).toBe(true));

    act(() => {
      result.current.dismissError();
    });

    expect(result.current.error).toBe(false);
    expect(result.current.messages).toHaveLength(1);
  });

  it('starts over, clearing the thread and any error on it', async () => {
    const mocks = [chatMock('will fail', { result: undefined, error: new Error('offline') })];
    const { result } = renderHook(() => useAgent(), { wrapper: wrapper(mocks) });
    act(() => {
      result.current.send('will fail');
    });
    await waitFor(() => expect(result.current.error).toBe(true));

    act(() => {
      result.current.restart();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBe(false);
  });
});
