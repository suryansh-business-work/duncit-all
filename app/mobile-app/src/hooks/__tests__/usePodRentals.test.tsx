import { act, renderHook, waitFor } from '@testing-library/react-native';

import { PodRentalsDocument, PublicRentalSettingsDocument } from '@/graphql/rentals';
import { usePodRentals } from '@/hooks/usePodRentals';
import { graphqlRequest } from '@/services/graphql.client';
import { usePodRentalPicks, useRentalPicksStore } from '@/stores/rental-picks.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

const SETTINGS = {
  enabled: true,
  terms_html: '<p>Duncit terms</p>',
  rent_refundable_on_backout: true,
  deposit_refundable: true,
  booking_cutoff_hours: 2,
};
const catalogue = (over: Record<string, unknown> = {}) => ({
  open: true,
  closed_reason: null,
  hours: 2,
  currency_symbol: '₹',
  venue_terms_html: '<p>Venue terms</p>',
  items: [
    { id: 'i1', name: 'Racket', unit: 'HOUR', rate: 100 },
    { id: 'i2', name: 'Shoes', unit: 'SLOT', rate: 50 },
  ],
  ...over,
});

/** Answers each document the hook asks for. */
const serve = (podRentals: unknown) =>
  mockRequest.mockImplementation((doc: unknown) =>
    Promise.resolve(
      doc === PodRentalsDocument ? { podRentals } : { publicRentalSettings: SETTINGS },
    ),
  );

beforeEach(() => mockRequest.mockReset());

describe('usePodRentals', () => {
  it('loads the catalogue and the rules together, reading generated enums as plain strings', async () => {
    serve(catalogue());
    const { result } = renderHook(() => usePodRentals('pod-1', true));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.catalogue).not.toBeNull());
    expect(mockRequest).toHaveBeenCalledWith(PodRentalsDocument, { pod_id: 'pod-1' });
    expect(mockRequest).toHaveBeenCalledWith(PublicRentalSettingsDocument);
    expect(result.current.catalogue).toMatchObject({
      open: true,
      closed_reason: null,
      venue_terms_html: '<p>Venue terms</p>',
      items: [
        { id: 'i1', unit: 'HOUR' },
        { id: 'i2', unit: 'SLOT' },
      ],
    });
    expect(result.current.settings).toEqual(SETTINGS);
    expect(result.current.loading).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it('keeps a known closed reason and drops one it does not know', async () => {
    serve(catalogue({ open: false, closed_reason: 'CUTOFF' }));
    const first = renderHook(() => usePodRentals('pod-1', true));
    await waitFor(() => expect(first.result.current.catalogue?.closed_reason).toBe('CUTOFF'));

    serve(catalogue({ open: false, closed_reason: 'SOMETHING_NEW' }));
    const second = renderHook(() => usePodRentals('pod-2', true));
    await waitFor(() => expect(second.result.current.catalogue).not.toBeNull());
    expect(second.result.current.catalogue?.closed_reason).toBeNull();
  });

  it('asks for nothing for a pod with no venue, or without an id', () => {
    const off = renderHook(() => usePodRentals('pod-1', false));
    const noId = renderHook(() => usePodRentals('', true));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(off.result.current.loading).toBe(false);
    expect(noId.result.current.catalogue).toBeNull();
  });

  it('flags a failed load, and a refetch that works clears it', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => usePodRentals('pod-1', true));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.catalogue).toBeNull();

    serve(catalogue());
    await act(() => result.current.refetch());
    expect(result.current.failed).toBe(false);
    expect(result.current.catalogue?.items).toHaveLength(2);
  });
});

describe('rental picks store', () => {
  beforeEach(() => act(() => useRentalPicksStore.setState({ byPod: {} })));

  it('keeps each pod’s picks apart, in whole units, and drops an item set to zero', () => {
    const a = renderHook(() => usePodRentalPicks('pod-a'));
    const b = renderHook(() => usePodRentalPicks('pod-b'));

    act(() => a.result.current.setQuantity('i1', 2.7));
    act(() => a.result.current.setQuantity('i2', 1));
    act(() => b.result.current.setQuantity('i1', 3));
    expect(a.result.current.picks).toEqual({ i1: 2, i2: 1 });
    expect(b.result.current.picks).toEqual({ i1: 3 });

    act(() => a.result.current.setQuantity('i2', 0));
    expect(a.result.current.picks).toEqual({ i1: 2 });
  });

  it('clears one pod without touching another, and an untouched pod reads empty', () => {
    const a = renderHook(() => usePodRentalPicks('pod-a'));
    const b = renderHook(() => usePodRentalPicks('pod-b'));
    act(() => a.result.current.setQuantity('i1', 1));
    act(() => b.result.current.setQuantity('i1', 1));

    act(() => a.result.current.clear());
    expect(a.result.current.picks).toEqual({});
    expect(b.result.current.picks).toEqual({ i1: 1 });
    expect(renderHook(() => usePodRentalPicks('pod-c')).result.current.picks).toEqual({});
  });
});
