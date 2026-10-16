import { act, renderHook } from '@testing-library/react-native';
import type { PodRentalCatalogue } from '@duncit/utils';

import { useCheckoutRentals } from '@/hooks/useCheckoutRentals';
import { usePodRentals } from '@/hooks/usePodRentals';
import { useRentalPicksStore } from '@/stores/rental-picks.store';

jest.mock('@/hooks/usePodRentals', () => ({ usePodRentals: jest.fn() }));

const mockPodRentals = usePodRentals as jest.Mock;

const catalogue = (over: Partial<PodRentalCatalogue> = {}): PodRentalCatalogue => ({
  open: true,
  closed_reason: null,
  hours: 2,
  currency_symbol: '₹',
  venue_terms_html: '<p>Venue terms</p>',
  items: [
    {
      id: 'racket',
      name: 'Racket',
      description: '',
      images: [],
      unit: 'HOUR',
      rate: 100,
      deposit: 300,
      available: 4,
      per_guest_limit: 2,
    },
  ],
  ...over,
});

const SETTINGS = { deposit_refundable: true, terms_html: '' };
const serve = (value: PodRentalCatalogue | null) =>
  mockPodRentals.mockReturnValue({
    catalogue: value,
    settings: SETTINGS,
    failed: false,
    loading: false,
    refetch: jest.fn(),
  });

const pick = (podId: string, picks: Record<string, number>) =>
  act(() => useRentalPicksStore.setState({ byPod: { [podId]: picks } }));

const POD = { id: 'pod-1', venue_id: 'v1', pod_mode: 'PHYSICAL', pod_amount: 0 };

beforeEach(() => {
  mockPodRentals.mockReset();
  act(() => useRentalPicksStore.setState({ byPod: {} }));
});

describe('useCheckoutRentals', () => {
  it('prices the picks on a free pod too: the rentals are then the whole payment', () => {
    serve(catalogue());
    pick('pod-1', { racket: 1 });
    const { result } = renderHook(() => useCheckoutRentals(POD, false));

    expect(mockPodRentals).toHaveBeenCalledWith('pod-1', true);
    // 100 × 2 hours + 300 deposit.
    expect(result.current.totals).toEqual({ rent: 200, deposit: 300, total: 500, count: 1 });
    expect(result.current.selections).toEqual([{ item_id: 'racket', quantity: 1 }]);
    expect(result.current.currency).toBe('₹');
    expect(result.current.venueTerms).toBe('<p>Venue terms</p>');
    expect(result.current.settings).toBe(SETTINGS);
  });

  it('holds the booking until the guest agrees to the rental terms', () => {
    serve(catalogue());
    pick('pod-1', { racket: 1 });
    const { result } = renderHook(() => useCheckoutRentals(POD, false));

    expect(result.current.blocked).toBe(true);
    act(() => result.current.setAgreed(true));
    expect(result.current.agreed).toBe(true);
    expect(result.current.blocked).toBe(false);
  });

  it('blocks nothing when nothing is picked, and drops picks the venue no longer lists', () => {
    serve(catalogue());
    pick('pod-1', { gone: 3 });
    const { result } = renderHook(() => useCheckoutRentals(POD, false));
    expect(result.current.totals.count).toBe(0);
    expect(result.current.selections).toEqual([]);
    expect(result.current.blocked).toBe(false);
  });

  it('rents nothing for a virtual pod or a pod with no venue', () => {
    serve(catalogue());
    pick('pod-1', { racket: 1 });
    const virtual = renderHook(() => useCheckoutRentals({ ...POD, pod_mode: 'VIRTUAL' }, false));
    expect(mockPodRentals).toHaveBeenLastCalledWith('pod-1', false);
    expect(virtual.result.current.totals.count).toBe(0);
    expect(virtual.result.current.currency).toBe('');
    expect(virtual.result.current.venueTerms).toBe('');

    renderHook(() => useCheckoutRentals({ ...POD, venue_id: null }, false));
    expect(mockPodRentals).toHaveBeenLastCalledWith('pod-1', false);
  });

  it('reads a missing pod as nothing to rent', () => {
    serve(null);
    const { result } = renderHook(() => useCheckoutRentals(null, false));
    expect(mockPodRentals).toHaveBeenCalledWith('', false);
    expect(result.current.totals.count).toBe(0);
  });

  it('charges nothing once renting closed, even with picks carried over', () => {
    serve(catalogue({ open: false, closed_reason: 'CUTOFF' }));
    pick('pod-1', { racket: 1 });
    const { result } = renderHook(() => useCheckoutRentals(POD, false));
    expect(result.current.totals.total).toBe(0);
  });

  it('clears the pod’s picks once the booking is paid', () => {
    serve(catalogue());
    pick('pod-1', { racket: 1 });
    const { rerender } = renderHook(
      ({ paid }: { paid: boolean }) => useCheckoutRentals(POD, paid),
      {
        initialProps: { paid: false },
      },
    );
    expect(useRentalPicksStore.getState().byPod['pod-1']).toEqual({ racket: 1 });

    rerender({ paid: true });
    expect(useRentalPicksStore.getState().byPod['pod-1']).toBeUndefined();
  });
});
