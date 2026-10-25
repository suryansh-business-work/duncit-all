import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import type { VenueChatLine } from '@duncit/utils';
import { useChatVenueOffer, usePodVenueOffer } from '../src/offers/host/usePodVenueOffer';
import { POD_VENUE_OFFER_TERMS } from '../src/offers/host/queries';
import { SETTLED, failWith, makeMove, makePodOffer, mockOf, type Vars } from './offer-fixtures';

const warn = vi.hoisted(() => vi.fn());
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }),
}));

const wrapperOf =
  (mocks: MockedResponse[]) =>
  ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {children}
    </MockedProvider>
  );

const offerMock = (seen: Vars[], answer: (call: number) => object = () => ({ data: { podVenueOffer: makePodOffer() } })) => {
  let calls = 0;
  return mockOf(POD_VENUE_OFFER_TERMS, () => answer(++calls), seen);
};

const offerLine = (id: string, round: number): Pick<VenueChatLine, 'id' | 'type' | 'offer'> => ({ id, type: 'OFFER', offer: makeMove({ round }) });
const textLine = (id: string): Pick<VenueChatLine, 'id' | 'type' | 'offer'> => ({ id, type: 'TEXT', offer: null });

describe('usePodVenueOffer', () => {
  it("reads the pod's live offer", async () => {
    const seen: Vars[] = [];
    const { result } = renderHook(() => usePodVenueOffer('pod-1'), { wrapper: wrapperOf([offerMock(seen)]) });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.offer?.slot_id).toBe('slot-1'), SETTLED);
    expect(result.current.loading).toBe(false);
    expect(seen).toEqual([{ pod_id: 'pod-1' }]);
  });

  it('reads nothing without a pod, and is null for a pod with no offer', async () => {
    const seen: Vars[] = [];
    const skipped = renderHook(() => usePodVenueOffer(null), { wrapper: wrapperOf([offerMock(seen)]) });
    expect(skipped.result.current).toMatchObject({ offer: null, loading: false });
    expect(seen).toEqual([]);

    const none = renderHook(() => usePodVenueOffer('pod-2'), {
      wrapper: wrapperOf([offerMock([], () => ({ data: { podVenueOffer: null } }))]),
    });
    await waitFor(() => expect(none.result.current.loading).toBe(false), SETTLED);
    expect(none.result.current.offer).toBeNull();
  });
});

describe('useChatVenueOffer', () => {
  type Props = { lines: Pick<VenueChatLine, 'id' | 'type' | 'offer'>[]; ready: boolean };

  const follow = (mocks: MockedResponse[], initial: Props) =>
    renderHook(({ lines, ready }: Props) => useChatVenueOffer('pod-1', lines, ready), { wrapper: wrapperOf(mocks), initialProps: initial });

  it('names the newest offer line, and re-reads the offer only when a new one arrives after the first page', async () => {
    const seen: Vars[] = [];
    const hook = follow([offerMock(seen)], { lines: [], ready: false });
    await waitFor(() => expect(hook.result.current.offer).not.toBeNull(), SETTLED);
    expect(hook.result.current.newestId).toBeNull();

    // The first page lands: what it holds is what the first read already saw.
    hook.rerender({ lines: [offerLine('m1', 1)], ready: true });
    expect(hook.result.current.newestId).toBe('m1');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(seen).toHaveLength(1);

    // A text line is no move.
    hook.rerender({ lines: [offerLine('m1', 1), textLine('t1')], ready: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(seen).toHaveLength(1);

    // Someone moved.
    hook.rerender({ lines: [offerLine('m1', 1), textLine('t1'), offerLine('m2', 2)], ready: true });
    expect(hook.result.current.newestId).toBe('m2');
    await waitFor(() => expect(seen).toHaveLength(2), SETTLED);
  });

  it('logs a failed re-read and keeps the thread going', async () => {
    const seen: Vars[] = [];
    const answer = (call: number) => (call === 1 ? { data: { podVenueOffer: makePodOffer() } } : failWith('down')());
    const hook = follow([offerMock(seen, answer)], { lines: [offerLine('m1', 1)], ready: true });
    await waitFor(() => expect(hook.result.current.offer).not.toBeNull(), SETTLED);

    hook.rerender({ lines: [offerLine('m1', 1), offerLine('m2', 2)], ready: true });
    await waitFor(() => expect(warn).toHaveBeenCalledWith('venueOffer', 'chatRefresh', expect.objectContaining({ pod_id: 'pod-1' })), SETTLED);
    expect(hook.result.current.newestId).toBe('m2');
  });
});
