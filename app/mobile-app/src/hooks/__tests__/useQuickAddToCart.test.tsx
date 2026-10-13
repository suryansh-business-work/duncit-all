import { act, renderHook } from '@testing-library/react-native';

import { useQuickAddToCart } from '@/hooks/useQuickAddToCart';
import { graphqlRequest } from '@/services/graphql.client';
import { useCartStore } from '@/stores/cart.store';
import type { ShopProduct } from '@/screens/ShopScreen';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const pod = (over: Record<string, unknown> = {}) => ({
  pod_id: 'pod-1',
  pod_title: 'Pod One',
  club_slug: 'club',
  product_name: 'Item',
  unit_cost: 100,
  available_count: 5,
  free_delivery_above: null,
  image_url: 'http://x/p.jpg',
  ...over,
});

const product = { id: 'p1' } as ShopProduct;

beforeEach(() => {
  mockRequest.mockReset();
  useCartStore.setState({ lines: [] });
});

describe('useQuickAddToCart', () => {
  it('adds the base product via the cheapest pod, then increments', async () => {
    mockRequest.mockResolvedValue({
      podsForProduct: [
        pod({ pod_id: 'dear', unit_cost: 200 }),
        pod({ pod_id: 'cheap', unit_cost: 80 }),
      ],
    });
    const { result } = renderHook(() => useQuickAddToCart());

    await act(async () => {
      await result.current.add(product);
    });
    const lines = useCartStore.getState().lines;
    expect(lines).toHaveLength(1);
    expect(lines[0]?.pod_id).toBe('cheap');
    expect(lines[0]?.quantity).toBe(1);
    expect(result.current.addingId).toBeNull();

    await act(async () => {
      await result.current.add(product);
    });
    expect(useCartStore.getState().lines[0]?.quantity).toBe(2);
  });

  it('adds nothing and tells the buyer when no live pod stocks the product', async () => {
    mockRequest.mockResolvedValue({ podsForProduct: [] });
    const { result } = renderHook(() => useQuickAddToCart());

    await act(async () => {
      await result.current.add(product);
    });
    expect(useCartStore.getState().lines).toHaveLength(0);
    expect(result.current.addingId).toBeNull();
    expect(result.current.notice).toEqual({
      tone: 'info',
      message: 'No pod stocks this product right now.',
    });
  });

  it('stops at the pod stock instead of over-filling the line', async () => {
    mockRequest.mockResolvedValue({ podsForProduct: [pod({ available_count: 1 })] });
    const { result } = renderHook(() => useQuickAddToCart());

    await act(async () => {
      await result.current.add(product);
    });
    expect(useCartStore.getState().lines[0]?.quantity).toBe(1);
    expect(result.current.notice).toBeNull();

    await act(async () => {
      await result.current.add(product);
    });
    expect(useCartStore.getState().lines[0]?.quantity).toBe(1);
    expect(result.current.notice).toEqual({
      tone: 'info',
      message: 'You already have all the available stock of this product in your cart.',
    });
  });

  it('quick-adds through setQuantity while the product has no line, and reports that line', async () => {
    mockRequest.mockResolvedValue({ podsForProduct: [pod({ pod_id: 'cheap', unit_cost: 80 })] });
    const { result } = renderHook(() => useQuickAddToCart());
    expect(result.current.lineOf('p1')).toBeUndefined();

    await act(async () => {
      result.current.setQuantity(product, 1);
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(result.current.lineOf('p1')).toEqual(
      expect.objectContaining({ pod_id: 'cheap', quantity: 1, max_quantity: 5 }),
    );
  });

  it('steps and removes an existing line without another pod lookup', () => {
    useCartStore.setState({
      lines: [
        {
          pod_id: 'pod-1',
          pod_title: 'Pod One',
          club_slug: 'club',
          product_id: 'p1',
          variant_id: '',
          variant_label: '',
          product_name: 'Item',
          image_url: '',
          unit_cost: 100,
          max_quantity: 5,
          free_delivery_above: null,
          quantity: 2,
        },
      ],
    });
    const { result } = renderHook(() => useQuickAddToCart());

    act(() => result.current.setQuantity(product, 3));
    expect(result.current.lineOf('p1')?.quantity).toBe(3);
    expect(useCartStore.getState().lines[0]?.pod_id).toBe('pod-1');

    act(() => result.current.setQuantity(product, 0));
    expect(useCartStore.getState().lines).toHaveLength(0);
    expect(result.current.lineOf('p1')).toBeUndefined();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('does not look anything up when asked to remove a product that is not in the cart', () => {
    const { result } = renderHook(() => useQuickAddToCart());
    act(() => result.current.setQuantity(product, 0));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('shows the base line on the card, never a variant line of the same product', () => {
    const meta = {
      pod_id: 'pod-1',
      pod_title: 'Pod One',
      club_slug: 'club',
      product_id: 'p1',
      variant_label: '',
      product_name: 'Item',
      image_url: '',
      unit_cost: 100,
      max_quantity: 5,
      free_delivery_above: null,
    };
    useCartStore.setState({
      lines: [
        { ...meta, variant_id: '', quantity: 1 },
        { ...meta, variant_id: 'v1', quantity: 4 },
      ],
    });
    const { result } = renderHook(() => useQuickAddToCart());
    expect(result.current.lineOf('p1')).toEqual(
      expect.objectContaining({ variant_id: '', quantity: 1 }),
    );
    expect(result.current.lineOf('other')).toBeUndefined();
  });

  it('surfaces a failed lookup as a danger notice that clears itself', async () => {
    jest.useFakeTimers();
    try {
      mockRequest.mockRejectedValue(new Error('offline'));
      const { result } = renderHook(() => useQuickAddToCart());

      await act(async () => {
        await result.current.add(product);
      });
      expect(useCartStore.getState().lines).toHaveLength(0);
      expect(result.current.addingId).toBeNull();
      expect(result.current.notice).toEqual({
        tone: 'danger',
        message: 'Could not add this to your cart. Please try again.',
      });

      act(() => {
        jest.advanceTimersByTime(4000);
      });
      expect(result.current.notice).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
