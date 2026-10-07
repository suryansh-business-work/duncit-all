import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';

import {
  CANCEL_POD_PARTNER_REQUEST,
  REQUEST_POD_PARTNER_SLOT,
  RESPOND_POD_PARTNER_REQUEST,
  RESPOND_POD_PARTNER_SLOT,
} from '../queries';
import { usePodRequestActions } from '../usePodRequestActions';

const moved = (field: string, status: string) => ({
  data: { [field]: { __typename: 'PodPartnerRequest', id: 'req-1', status } },
});

function renderActions(mocks: MockedResponse[]) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {children}
    </MockedProvider>
  );
  return renderHook(() => usePodRequestActions(), { wrapper });
}

describe('usePodRequestActions', () => {
  it.each([
    [
      'respond',
      { query: RESPOND_POD_PARTNER_REQUEST, variables: { id: 'req-1', accept: true } },
      moved('respondPodPartnerRequest', 'ACCEPTED'),
      (a: ReturnType<typeof usePodRequestActions>) => a.respond('req-1', true),
    ],
    [
      'withdraw',
      { query: CANCEL_POD_PARTNER_REQUEST, variables: { id: 'req-1' } },
      moved('cancelPodPartnerRequest', 'CANCELLED'),
      (a: ReturnType<typeof usePodRequestActions>) => a.withdraw('req-1'),
    ],
    [
      'requestSlot',
      { query: REQUEST_POD_PARTNER_SLOT, variables: { id: 'req-1', slot_id: 'slot-7' } },
      moved('requestPodPartnerSlot', 'SLOT_REQUESTED'),
      (a: ReturnType<typeof usePodRequestActions>) => a.requestSlot('req-1', 'slot-7'),
    ],
    [
      'respondSlot',
      { query: RESPOND_POD_PARTNER_SLOT, variables: { id: 'req-1', confirm: false } },
      moved('respondPodPartnerSlot', 'ACCEPTED'),
      (a: ReturnType<typeof usePodRequestActions>) => a.respondSlot('req-1', false),
    ],
  ])('%s sends its mutation with the right variables and resolves true', async (_name, request, result, call) => {
    const { result: hook } = renderActions([{ request, result }]);

    let ok = false;
    await act(async () => {
      ok = await call(hook.current);
    });

    expect(ok).toBe(true);
    expect(hook.current.error).toBe('');
    expect(hook.current.busy).toBe(false);
  });

  it("resolves false and keeps the server's CONFLICT message instead of swallowing it", async () => {
    const { result } = renderActions([
      {
        request: { query: RESPOND_POD_PARTNER_SLOT, variables: { id: 'req-1', confirm: true } },
        result: {
          errors: [new GraphQLError('The slot is no longer available.', { extensions: { code: 'CONFLICT' } })],
        },
      },
    ]);

    let ok = true;
    await act(async () => {
      ok = await result.current.respondSlot('req-1', true);
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('The slot is no longer available.');
  });

  it('clears the previous error once the next write succeeds', async () => {
    const { result } = renderActions([
      { request: { query: CANCEL_POD_PARTNER_REQUEST, variables: { id: 'req-1' } }, error: new Error('Request timed out') },
      { request: { query: CANCEL_POD_PARTNER_REQUEST, variables: { id: 'req-1' } }, result: moved('cancelPodPartnerRequest', 'CANCELLED') },
    ]);

    await act(async () => {
      await result.current.withdraw('req-1');
    });
    expect(result.current.error).toBe('Request timed out');

    await act(async () => {
      await result.current.withdraw('req-1');
    });
    expect(result.current.error).toBe('');
  });

  it('dismisses an error with clearError', async () => {
    const { result } = renderActions([
      { request: { query: REQUEST_POD_PARTNER_SLOT, variables: { id: 'req-1', slot_id: 's' } }, error: new Error('Nope') },
    ]);
    await act(async () => {
      await result.current.requestSlot('req-1', 's');
    });
    expect(result.current.error).toBe('Nope');

    act(() => result.current.clearError());

    expect(result.current.error).toBe('');
  });

  it('is busy while a write is in flight', async () => {
    const { result } = renderHook(() => usePodRequestActions(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MockedProvider
          mocks={[
            {
              request: { query: RESPOND_POD_PARTNER_REQUEST, variables: { id: 'req-1', accept: false } },
              result: moved('respondPodPartnerRequest', 'REJECTED'),
              delay: 30,
            },
          ]}
        >
          {children}
        </MockedProvider>
      ),
    });

    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = result.current.respond('req-1', false);
    });
    await waitFor(() => expect(result.current.busy).toBe(true));
    await act(async () => {
      await pending;
    });
    expect(result.current.busy).toBe(false);
  });
});
