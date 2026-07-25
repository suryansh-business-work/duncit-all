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

  it('no-ops when no live pod stocks the product', async () => {
    mockRequest.mockResolvedValue({ podsForProduct: [] });
    const { result } = renderHook(() => useQuickAddToCart());

    await act(async () => {
      await result.current.add(product);
    });
    expect(useCartStore.getState().lines).toHaveLength(0);
    expect(result.current.addingId).toBeNull();
  });
});
