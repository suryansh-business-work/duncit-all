import { act, renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKOUT,
  CANCEL_BACKOUT,
  INC_HITS,
  JOIN_FREE,
  REDEEM,
  TOGGLE_SAVED_POD_DETAIL,
} from '../queries';
import { buildPodShareText, usePodDetailActions } from '../usePodDetailActions';

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
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    ),
  });
  return { ...utils, refetch, navigate };
}

describe('buildPodShareText', () => {
  it('returns empty string for null pod', () => {
    expect(buildPodShareText(null)).toBe('');
  });

  it('includes when + where lines', () => {
    const text = buildPodShareText(POD);
    expect(text).toContain('When:');
    expect(text).toContain('Where: Central Park · Gate 4');
  });

  it('skips invalid date and missing place', () => {
    const text = buildPodShareText({ pod_date_time: 'not-a-date', place_label: '' });
    expect(text).toBe('');
  });

  it('handles only a place_label', () => {
    expect(buildPodShareText({ place_label: 'Beach' })).toBe('Where: Beach');
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
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sunset Run', url: expect.stringContaining('pod/DUN-1') }),
    );
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

  it('onJoinFree sets confetti + snack and refetches', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ id: 'pod-doc-1', referral: null }, JOIN_FREE, {
        data: { joinFreePod: { id: 'm1', status: 'ACTIVE' } },
      }),
    ];
    const { result, refetch } = renderActions({}, mocks);
    await act(async () => {
      await result.current.onJoinFree();
    });
    expect(result.current.confettiOpen).toBe(true);
    expect(result.current.snack).toBe('Joined!');
    expect(refetch).toHaveBeenCalled();
  });

  it('onJoinFree snacks on error', async () => {
    const mocks = [
      ...baseMocks(),
      makeMock({ id: 'pod-doc-1', referral: null }, JOIN_FREE, null, new Error('full')),
    ];
    const { result } = renderActions({}, mocks);
    await act(async () => {
      await result.current.onJoinFree();
    });
    await waitFor(() => expect(result.current.snack).toBe('full'));
  });

  it('onJoinFree no-ops with no pod', async () => {
    const { result } = renderActions({ pod: null });
    await act(async () => {
      await result.current.onJoinFree();
    });
    expect(result.current.snack).toBeNull();
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
      makeMock({ id: 'pod-doc-1' }, BACKOUT, {
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
      makeMock({ id: 'pod-doc-1' }, BACKOUT, null, new Error('too late')),
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
