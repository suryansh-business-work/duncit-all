import { act, renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKOUT,
  CANCEL_BACKOUT,
  CANCEL_FREE_SPOT,
  INC_HITS,
  JOIN_FREE,
  REDEEM,
  TOGGLE_SAVED_POD_DETAIL,
} from '../queries';
import { buildPodShareText, usePodDetailActions } from '../usePodDetailActions';
import { GraphQLError } from 'graphql';

const POD = {
  id: 'pod-doc-1',
  pod_id: 'DUN-1',
  pod_title: 'Sunset Run',
  club_slug: 'club-x',
  pod_amount: 100,
  pod_date_time: '2026-08-01T18:30:00.000Z',
  place_label: 'Central Park',
  place_detail: 'Gate 4',
  product_requests: [{ product_id: 'p1', unit_cost: 10 }],
};

function makeMock(request: any, doc: any, result: any, error?: any) {
  return {
    request: { query: doc, variables: request },
    ...(error ? { error } : { result }),
  };
}

function baseMocks() {
  return [
    makeMock({ id: 'pod-doc-1' }, INC_HITS, {
      data: { incrementPodHits: { id: 'pod-doc-1', pod_hits: 5, __typename: 'Pod' } },
    }),
  ];
}

function renderActions(overrides: Partial<Parameters<typeof usePodDetailActions>[0]> = {}, mocks: any[] = baseMocks()) {
  const refetch = vi.fn().mockResolvedValue(undefined);
  const navigate = vi.fn();
  const args = {
    id: 'pod-doc-1',
    pod: POD,
    saved: false,
    savedIds: ['other'],
    referralFromUrl: null as string | null,
    refetch,
    navigate,
    ...overrides,
  };
  const utils = renderHook(() => usePodDetailActions(args as any), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        {children}
      </MockedProvider>
    ),
  });
  return { ...utils, refetch, navigate };
}

describe('buildPodShareText', () => {
  const URL = 'https://duncit.com/club/c/pod/p';

  it('falls back to the bare link with no pod', () => {
    expect(buildPodShareText(null, URL)).toBe(URL);
  });

  it('shares title, when, where, a map link and the pod link', () => {
    const text = buildPodShareText(POD, URL);
    expect(text).toContain('When:');
    expect(text).toContain('Where: Central Park · Gate 4');
    // The venue has no coordinates on the Pod, so the map link is a Maps search
    // over the venue text.
    expect(text).toContain(
      'Location: https://www.google.com/maps/search/?api=1&query=Central%20Park%2C%20Gate%204',
    );
    expect(text).toContain(`Join on Duncit: ${URL}`);
  });

  it('drops the when and location lines rather than leaving empty labels', () => {
    const text = buildPodShareText({ pod_date_time: 'not-a-date', place_label: '' }, URL);
    expect(text).not.toContain('When:');
    expect(text).not.toContain('Location:');
    expect(text).toBe(`Join on Duncit: ${URL}`);
  });

  it('handles only a place_label', () => {
    const text = buildPodShareText({ place_label: 'Beach' }, URL);
    expect(text).toContain('Where: Beach');
    expect(text).toContain('Location: https://www.google.com/maps/search/?api=1&query=Beach');
  });
});

describe('usePodDetailActions', () => {
  const origNavigator = { share: (navigator as any).share, clipboard: (navigator as any).clipboard };

  beforeEach(() => {
    delete (navigator as any).share;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(globalThis.window, 'location', {
      configurable: true,
      value: { href: 'https://mweb.duncit.com/club/club-x/pod/DUN-1', origin: 'https://mweb.duncit.com' },
    });
  });

  afterEach(() => {
    (navigator as any).share = origNavigator.share;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: origNavigator.clipboard });
    vi.restoreAllMocks();
  });

  it('exposes initial state and derives displaySaved from saved', () => {
    const { result } = renderActions();
    expect(result.current.backoutOpen).toBe(false);
    expect(result.current.keepSpotOpen).toBe(false);
    expect(result.current.confettiOpen).toBe(false);
    expect(result.current.displaySaved).toBe(false);
    expect(result.current.snack).toBeNull();
  });

  it('fires INC_HITS on mount (id present)', async () => {
    const seen: any[] = [];
    renderActions({}, [
      {
        request: { query: INC_HITS, variables: { id: 'pod-doc-1' } },
        result: () => {
          seen.push(1);
          return { data: { incrementPodHits: { id: 'pod-doc-1', pod_hits: 9 } } };
        },
      },
    ]);
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
  });

  it('redeems a referral from url: sets snack, confetti, refetch', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ token: 'tok-abc' }, REDEEM, {
        data: { redeemPodReferral: { id: 'm1', status: 'ACTIVE' } },
      }),
    ];
    const { result, refetch } = renderActions({ referralFromUrl: 'tok-abc' }, mocks);
    await waitFor(() => expect(result.current.snack).toBe('Joined via referral'));
    expect(result.current.confettiOpen).toBe(true);
    expect(refetch).toHaveBeenCalled();
  });

  it('surfaces referral redemption error in snack', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ token: 'bad' }, REDEEM, null, new Error('bad token')),
    ];
    const { result } = renderActions({ referralFromUrl: 'bad' }, mocks);
    await waitFor(() => expect(result.current.snack).toBe('bad token'));
  });

  it('onToggleSave flips displaySaved optimistically then completes', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ pod_doc_id: 'pod-doc-1' }, TOGGLE_SAVED_POD_DETAIL, {
        data: { toggleSavedPod: { pod_id: 'pod-doc-1', saved: true, saved_pod_ids: ['other', 'pod-doc-1'] } },
      }),
    ];
    const { result } = renderActions({}, mocks);
    await act(async () => {
      await result.current.onToggleSave();
    });
    expect(result.current.displaySaved).toBe(true);
    expect(result.current.savePending).toBe(false);
  });

  it('onToggleSave reverts + snacks on error', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ pod_doc_id: 'pod-doc-1' }, TOGGLE_SAVED_POD_DETAIL, null, new Error('save failed')),
    ];
    const { result } = renderActions({}, mocks);
    await act(async () => {
      await result.current.onToggleSave();
    });
    await waitFor(() => expect(result.current.snack).toBe('save failed'));
    expect(result.current.displaySaved).toBe(false);
  });

  it('onToggleSave no-ops with no pod', async () => {
    const { result } = renderActions({ pod: null });
    await act(async () => {
      await result.current.onToggleSave();
    });
    expect(result.current.displaySaved).toBe(false);
  });

  it('onShare uses navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    (navigator as any).share = share;
    const { result } = renderActions();
    await act(async () => {
      await result.current.onShare();
    });
    // No `url` field: share targets that prefer `url` would drop `text`, so the
    // pod link travels as the last line of `text` instead.
    expect(share).toHaveBeenCalledTimes(1);
    const payload = share.mock.calls[0][0];
    expect(payload).not.toHaveProperty('url');
    expect(payload.title).toBe('Sunset Run');
    expect(payload.text).toMatch(/^Sunset Run\n/);
    expect(payload.text).toMatch(/pod\/DUN-1$/);
  });

  it('onShare falls back to clipboard + snack when no native share', async () => {
    const { result } = renderActions();
    await act(async () => {
      await result.current.onShare();
    });
    expect((navigator as any).clipboard.writeText).toHaveBeenCalled();
    expect(result.current.snack).toBe('Link copied');
  });

  it('onShare swallows a cancelled share', async () => {
    (navigator as any).share = vi.fn().mockRejectedValue(new Error('cancel'));
    const { result } = renderActions();
    await act(async () => {
      await result.current.onShare();
    });
    expect(result.current.snack).toBeNull();
  });

  // A free join lands on the booked confirmation (the ticket download lives
  // there) instead of celebrating in place on Pod Details.
  it('onJoinFree navigates to the booked confirmation — no snack, confetti or refetch', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ id: 'pod-doc-1', referral: null, seats: 1 }, JOIN_FREE, {
        data: { joinFreePod: { id: 'm1', status: 'ACTIVE' } },
      }),
    ];
    const { result, refetch, navigate } = renderActions({}, mocks);
    await act(async () => {
      await result.current.onJoinFree();
    });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/pod/pod-doc-1/booked');
    expect(result.current.confettiOpen).toBe(false);
    expect(result.current.snack).toBeNull();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('onJoinFree snacks on error and stays on Pod Details', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ id: 'pod-doc-1', referral: null, seats: 1 }, JOIN_FREE, null, new Error('full')),
    ];
    const { result, navigate } = renderActions({}, mocks);
    await act(async () => {
      await result.current.onJoinFree();
    });
    await waitFor(() => expect(result.current.snack).toBe('full'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('onJoinFree no-ops with no pod', async () => {
    const { result, navigate } = renderActions({ pod: null });
    await act(async () => {
      await result.current.onJoinFree();
    });
    expect(result.current.snack).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('onPaidCheckout navigates with the membership amount only (no products)', () => {
    const { result, navigate } = renderActions();
    act(() => result.current.onPaidCheckout());
    expect(navigate).toHaveBeenCalledTimes(1);
    const [url, opts] = navigate.mock.calls[0];
    expect(url).toContain('/checkout/pod-doc-1?');
    expect(url).toContain('amount=100'); // pod_amount only
    expect(opts.state).toMatchObject({ pod_id: 'pod-doc-1', amount: 100 });
    // Pods never carry products into their payment.
    expect(opts.state.selected_products).toBeUndefined();
  });

  it('onPaidCheckout no-ops with no pod', () => {
    const { result, navigate } = renderActions({ pod: null });
    act(() => result.current.onPaidCheckout());
    expect(navigate).not.toHaveBeenCalled();
  });

  it('onCopyReferral writes a ref url + snack', () => {
    const { result } = renderActions();
    act(() => result.current.onCopyReferral('tok-9'));
    expect((navigator as any).clipboard.writeText).toHaveBeenCalledWith(
      'https://mweb.duncit.com/club/club-x/pod/DUN-1?ref=tok-9',
    );
    expect(result.current.snack).toBe('Referral link copied');
  });

  it('onCopyReferral no-ops with no pod', () => {
    const { result } = renderActions({ pod: null });
    act(() => result.current.onCopyReferral('tok-9'));
    expect(result.current.snack).toBeNull();
  });

  it('onConfirmBackout closes dialog, snacks, refetches', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ id: 'pod-doc-1', seats: null }, BACKOUT, {
        data: { backoutPod: { id: 'm1', status: 'BACKOUT', referral_token: null, refund_status: 'PENDING' } },
      }),
    ];
    const { result, refetch } = renderActions({}, mocks);
    act(() => result.current.setBackoutOpen(true));
    await act(async () => {
      await result.current.onConfirmBackout();
    });
    expect(result.current.backoutOpen).toBe(false);
    expect(result.current.snack).toContain('Backout in process');
    expect(refetch).toHaveBeenCalled();
  });

  it('onConfirmBackout closes + snacks error on failure', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ id: 'pod-doc-1', seats: null }, BACKOUT, null, new Error('too late')),
    ];
    const { result } = renderActions({}, mocks);
    act(() => result.current.setBackoutOpen(true));
    await act(async () => {
      await result.current.onConfirmBackout();
    });
    expect(result.current.backoutOpen).toBe(false);
    await waitFor(() => expect(result.current.snack).toBe('too late'));
  });

  it('onConfirmBackout no-ops with no pod', async () => {
    const { result } = renderActions({ pod: null });
    await act(async () => {
      await result.current.onConfirmBackout();
    });
    expect(result.current.snack).toBeNull();
  });

  it('openKeepSpot opens dialog and clears error; onConfirmKeepSpot restores', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ id: 'pod-doc-1' }, CANCEL_BACKOUT, {
        data: { cancelBackoutPod: { id: 'm1', status: 'ACTIVE', refund_status: null } },
      }),
    ];
    const { result, refetch } = renderActions({}, mocks);
    act(() => result.current.openKeepSpot());
    expect(result.current.keepSpotOpen).toBe(true);
    expect(result.current.keepSpotError).toBeNull();
    await act(async () => {
      await result.current.onConfirmKeepSpot();
    });
    expect(result.current.keepSpotOpen).toBe(false);
    expect(result.current.snack).toBe('Your booking is restored.');
    expect(refetch).toHaveBeenCalled();
  });

  it('onConfirmKeepSpot keeps dialog open + sets keepSpotError on failure', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ id: 'pod-doc-1' }, CANCEL_BACKOUT, null, new Error('already replaced')),
    ];
    const { result } = renderActions({}, mocks);
    act(() => result.current.openKeepSpot());
    await act(async () => {
      await result.current.onConfirmKeepSpot();
    });
    await waitFor(() => expect(result.current.keepSpotError).toBe('already replaced'));
    expect(result.current.keepSpotOpen).toBe(true);
  });

  it('onConfirmKeepSpot no-ops with no pod', async () => {
    const { result } = renderActions({ pod: null });
    await act(async () => {
      await result.current.onConfirmKeepSpot();
    });
    expect(result.current.keepSpotError).toBeNull();
  });

  // A free pod: cancel the spot, join again instantly, cancel again. The cap on
  // cancels is the server's (Pod Settings) — the hook just calls through.
  it('cancels a free spot, joins again and cancels again, calling the right mutation each time', async () => {
    const cancelled = { data: { cancelFreeSpot: { id: 'm1', status: 'BACKED_OUT', seats: 1 } } };
    const mocks = [
      ...baseMocks(),
      makeMock({ id: 'pod-doc-1' }, CANCEL_FREE_SPOT, cancelled),
      makeMock({ id: 'pod-doc-1', referral: null, seats: 1 }, JOIN_FREE, {
        data: { joinFreePod: { id: 'm1', status: 'JOINED', seats: 1 } },
      }),
      makeMock({ id: 'pod-doc-1' }, CANCEL_FREE_SPOT, cancelled),
    ];
    const { result, refetch, navigate } = renderActions({}, mocks);
    act(() => result.current.setCancelSpotOpen(true));
    expect(result.current.cancelSpotOpen).toBe(true);
    await act(async () => {
      await result.current.onConfirmCancelSpot();
    });
    expect(result.current.cancelSpotOpen).toBe(false);
    expect(result.current.snack).toBe(
      'Your spot is cancelled. You can join again any time while the pod is open.',
    );
    await act(async () => {
      await result.current.onJoinFree();
    });
    // The re-join lands on the booked confirmation; Pod Details re-reads on the way back.
    expect(navigate).toHaveBeenCalledWith('/pod/pod-doc-1/booked');
    await act(async () => {
      await result.current.onConfirmCancelSpot();
    });
    expect(result.current.snack).toBe(
      'Your spot is cancelled. You can join again any time while the pod is open.',
    );
    // Only the two cancels re-read the pod; the join navigates instead.
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('names a checked-in refusal and a started pod instead of the raw server text', async () => {
    const refusal = (code: string) => ({
      errors: [new GraphQLError('server words', { extensions: { code } })],
    });
    const mocks = [
      ...baseMocks(),
      makeMock({ id: 'pod-doc-1' }, CANCEL_FREE_SPOT, refusal('ALREADY_CHECKED_IN')),
      makeMock({ id: 'pod-doc-1' }, CANCEL_FREE_SPOT, refusal('BAD_REQUEST')),
      makeMock({ id: 'pod-doc-1' }, CANCEL_FREE_SPOT, null, new Error('Failed to fetch')),
    ];
    const { result, refetch } = renderActions({}, mocks);
    act(() => result.current.setCancelSpotOpen(true));
    await act(async () => {
      await result.current.onConfirmCancelSpot();
    });
    expect(result.current.snack).toBe(
      'You have already been checked in at this pod, so your spot can no longer be cancelled.',
    );
    expect(result.current.cancelSpotOpen).toBe(false);
    await act(async () => {
      await result.current.onConfirmCancelSpot();
    });
    expect(result.current.snack).toBe(
      'This pod has already started, so your spot can no longer be cancelled.',
    );
    await act(async () => {
      await result.current.onConfirmCancelSpot();
    });
    expect(result.current.snack).toBe('We could not cancel your spot. Please try again.');
    // The page re-reads after a refusal too: the server decided on fresher state.
    expect(refetch).toHaveBeenCalledTimes(3);
  });

  it('onConfirmCancelSpot no-ops with no pod', async () => {
    const { result, refetch } = renderActions({ pod: null });
    await act(async () => {
      await result.current.onConfirmCancelSpot();
    });
    expect(result.current.snack).toBeNull();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('setSnack / setConfettiOpen / setKeepSpotOpen setters are exposed', () => {
    const { result } = renderActions();
    act(() => result.current.setSnack('hi'));
    expect(result.current.snack).toBe('hi');
    act(() => result.current.setConfettiOpen(true));
    expect(result.current.confettiOpen).toBe(true);
    act(() => result.current.setKeepSpotOpen(true));
    expect(result.current.keepSpotOpen).toBe(true);
  });
});
