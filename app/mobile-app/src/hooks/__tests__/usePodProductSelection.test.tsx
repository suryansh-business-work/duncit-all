import { act, renderHook } from '@testing-library/react-native';

import { usePodProductSelection } from '@/hooks/usePodProductSelection';

const pod = {
  product_requests: [
    { product_id: 'a', unit_cost: 100 },
    { product_id: 'b', unit_cost: 50 },
  ],
} as never;

describe('usePodProductSelection', () => {
  it('starts empty and derives the list + total from picks (qty 0 dropped)', () => {
    const { result } = renderHook(() => usePodProductSelection('p1', pod));
    expect(result.current.selectedProducts).toEqual({});
    expect(result.current.selectedProductList).toEqual([]);
    expect(result.current.selectedProductTotal).toBe(0);

    act(() => result.current.setSelectedProducts({ a: 2, b: 0 }));
    expect(result.current.selectedProductList).toEqual([{ product_id: 'a', quantity: 2 }]);
    expect(result.current.selectedProductTotal).toBe(200);
  });

  it('ignores picks not in the catalogue and prices a null pod at zero', () => {
    const { result, rerender } = renderHook(
      ({ p }: { p: typeof pod | null }) => usePodProductSelection('p1', p),
      { initialProps: { p: pod as typeof pod | null } },
    );
    act(() => result.current.setSelectedProducts({ a: 1, ghost: 3 }));
    expect(result.current.selectedProductTotal).toBe(100);
    rerender({ p: null });
    expect(result.current.selectedProductTotal).toBe(0);
  });

  it('resets the selection when the pod id changes', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => usePodProductSelection(id, pod),
      { initialProps: { id: 'p1' } },
    );
    act(() => result.current.setSelectedProducts({ a: 2 }));
    expect(result.current.selectedProductList).toHaveLength(1);
    rerender({ id: 'p2' });
    expect(result.current.selectedProducts).toEqual({});
  });
});
