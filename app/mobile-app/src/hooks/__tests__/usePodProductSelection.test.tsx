import { act, renderHook } from '@testing-library/react-native';

import { usePodProductSelection } from '@/hooks/usePodProductSelection';
import { useCartStore } from '@/stores/cart.store';

jest.mock('@/services/cart', () => ({
  getCartLines: jest.fn().mockResolvedValue([]),
  setCartLines: jest.fn().mockResolvedValue(undefined),
}));

const pod = {
  pod_title: 'Pod One',
  club_slug: 'club-one',
  product_requests: [
    {
      product_id: 'a',
      product_name: 'Alpha',
      unit_cost: 100,
      quantity: 5,
      available_count: 5,
      image_url: 'http://x/a.jpg',
    },
    { product_id: 'b', product_name: 'Beta', unit_cost: 50, quantity: 3, available_count: 3 },
  ],
} as never;

beforeEach(() => {
  useCartStore.setState({ lines: [], hydrated: true });
});

describe('usePodProductSelection (cart-backed)', () => {
  it('starts empty and derives the map/list/total from base picks (qty 0 dropped)', () => {
    const { result } = renderHook(() => usePodProductSelection('p1', pod));
    expect(result.current.selectedProducts).toEqual({});
    expect(result.current.selectedProductList).toEqual([]);
    expect(result.current.selectedProductTotal).toBe(0);

    act(() => result.current.setSelectedProducts({ a: 2, b: 0 }));
    expect(result.current.selectedProducts).toEqual({ a: 2 });
    expect(result.current.selectedProductList).toEqual([
      { product_id: 'a', variant_id: '', quantity: 2, unit_cost: 100 },
    ]);
    expect(result.current.selectedProductTotal).toBe(200);
  });

  it('updates an existing line, no-ops equal writes, and drops unknown/variant-only keys', () => {
    const { result } = renderHook(() => usePodProductSelection('p1', pod));
    act(() => result.current.setSelectedProducts({ a: 1, ghost: 3, 'a::vx': 2 }));
    // ghost has no pod row; a::vx is a variant key (only the sheet adds those).
    expect(result.current.selectedProducts).toEqual({ a: 1 });
    act(() => result.current.setSelectedProducts({ a: 4 }));
    expect(result.current.selectedProducts).toEqual({ a: 4 });
    act(() => result.current.setSelectedProducts({ a: 4 }));
    expect(result.current.selectedProducts).toEqual({ a: 4 });
    act(() => result.current.setSelectedProducts({}));
    expect(result.current.selectedProducts).toEqual({});
  });

  it('scopes lines to the pod id — the cart keeps other pods intact', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => usePodProductSelection(id, pod),
      { initialProps: { id: 'p1' } },
    );
    act(() => result.current.setSelectedProducts({ a: 2 }));
    rerender({ id: 'p2' });
    expect(result.current.selectedProducts).toEqual({});
    rerender({ id: 'p1' });
    expect(result.current.selectedProducts).toEqual({ a: 2 });
  });

  it('adds variant lines with their own price via setVariantQuantity', () => {
    const { result } = renderHook(() => usePodProductSelection('p1', pod));
    act(() =>
      result.current.setVariantQuantity(
        {
          pod_id: 'p1',
          pod_title: 'Pod One',
          club_slug: 'club-one',
          product_id: 'a',
          variant_id: 'v1',
          variant_label: 'L / Blue',
          product_name: 'Alpha',
          image_url: '',
          unit_cost: 120,
          max_quantity: 4,
        },
        2,
      ),
    );
    expect(result.current.selectedProducts).toEqual({ 'a::v1': 2 });
    expect(result.current.selectedProductList).toEqual([
      { product_id: 'a', variant_id: 'v1', quantity: 2, unit_cost: 120 },
    ]);
    expect(result.current.selectedProductTotal).toBe(240);
  });

  it('fills line metadata from sparse pod rows (fallback title/slug/image/stock)', () => {
    const sparsePod = {
      product_requests: [
        // No image_url (falls to images[0]), no available_count (falls to
        // quantity), unit_cost missing (0), product_name missing.
        { product_id: 'c', images: ['http://x/c.jpg'], quantity: 2 },
        // Nothing at all beyond the id — every fallback bottoms out.
        { product_id: 'd' },
      ],
    } as never;
    const { result } = renderHook(() => usePodProductSelection('p9', sparsePod));
    act(() => result.current.setSelectedProducts({ c: 1, d: 1 }));
    const lines = useCartStore.getState().lines;
    expect(lines.find((l) => l.product_id === 'c')).toMatchObject({
      pod_title: '',
      club_slug: '',
      product_name: 'Product',
      image_url: 'http://x/c.jpg',
      unit_cost: 0,
      max_quantity: 2,
    });
    expect(lines.find((l) => l.product_id === 'd')).toMatchObject({
      image_url: '',
      max_quantity: 0,
    });
  });

  it('keeps line pricing when the pod goes null (the line carries its price)', () => {
    const { result, rerender } = renderHook(
      ({ p }: { p: typeof pod | null }) => usePodProductSelection('p1', p),
      { initialProps: { p: pod as typeof pod | null } },
    );
    act(() => result.current.setSelectedProducts({ a: 1 }));
    expect(result.current.selectedProductTotal).toBe(100);
    rerender({ p: null });
    expect(result.current.selectedProductTotal).toBe(100);
    // With no catalogue rows, new base keys can't be created — existing lines
    // are still adjustable.
    act(() => result.current.setSelectedProducts({ a: 2, b: 1 }));
    expect(result.current.selectedProducts).toEqual({ a: 2 });
  });
});
