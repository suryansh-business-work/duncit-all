import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CartProvider, useCart } from '../../../components/cart/CartContext';
import { usePodProductSelection } from '../usePodProductSelection';

const POD_ID = 'pod-1';

const pod = {
  pod_title: 'My Pod',
  club_slug: 'club-x',
  product_requests: [
    {
      product_id: 'p1',
      product_name: 'Widget',
      image_url: 'img1.png',
      unit_cost: 10,
      available_count: 5,
      free_delivery_above: 40,
    },
    {
      product_id: 'p2',
      // no product_name/image_url/unit_cost -> exercise fallbacks
      images: ['fallback.png'],
      quantity: 3,
    },
  ],
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

function renderSelection(podArg: any = pod) {
  return renderHook(
    () => ({
      selection: usePodProductSelection(POD_ID, podArg),
      cart: useCart(),
    }),
    { wrapper },
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('usePodProductSelection', () => {
  it('starts empty', () => {
    const { result } = renderSelection();
    expect(result.current.selection.selectedProducts).toEqual({});
    expect(result.current.selection.selectedProductList).toEqual([]);
    expect(result.current.selection.selectedProductTotal).toBe(0);
  });

  it('creates a base line from a product request and reflects it in the map/list/total', () => {
    const { result } = renderSelection();
    act(() => result.current.selection.setSelectedProducts({ p1: 2 }));

    expect(result.current.selection.selectedProducts).toEqual({ p1: 2 });
    expect(result.current.selection.selectedProductTotal).toBe(20);
    expect(result.current.selection.selectedProductList).toEqual([
      { product_id: 'p1', variant_id: '', quantity: 2, unit_cost: 10 },
    ]);
    // Line was written to the underlying cart with the correct meta.
    const line = result.current.cart.lines.find((l) => l.product_id === 'p1');
    expect(line).toMatchObject({
      pod_id: POD_ID,
      pod_title: 'My Pod',
      club_slug: 'club-x',
      product_name: 'Widget',
      image_url: 'img1.png',
      unit_cost: 10,
      max_quantity: 5,
      variant_id: '',
      // The product's free-delivery threshold rides the line (badge in cart/checkout).
      free_delivery_above: 40,
    });
  });

  it('uses fallbacks for a sparse product request row', () => {
    const { result } = renderSelection();
    act(() => result.current.selection.setSelectedProducts({ p2: 1 }));
    const line = result.current.cart.lines.find((l) => l.product_id === 'p2');
    expect(line).toMatchObject({
      product_name: 'Product',
      image_url: 'fallback.png',
      unit_cost: 0,
      max_quantity: 3,
      free_delivery_above: null,
    });
  });

  it('adjusts the quantity of an existing line and removes it at zero', () => {
    const { result } = renderSelection();
    act(() => result.current.selection.setSelectedProducts({ p1: 2 }));
    act(() => result.current.selection.setSelectedProducts({ p1: 4 }));
    expect(result.current.selection.selectedProducts).toEqual({ p1: 4 });

    // Key omitted from next -> treated as quantity 0 -> removed.
    act(() => result.current.selection.setSelectedProducts({}));
    expect(result.current.selection.selectedProducts).toEqual({});
    expect(result.current.cart.lines).toHaveLength(0);
  });

  it('ignores unknown products and variant keys when writing base lines', () => {
    const { result } = renderSelection();
    act(() =>
      result.current.selection.setSelectedProducts({
        unknown: 3, // no matching product_request row
        'p1::v9': 2, // variant key -> not a base line
      }),
    );
    expect(result.current.cart.lines).toHaveLength(0);
    expect(result.current.selection.selectedProducts).toEqual({});
  });

  it('adds/adjusts a variant line via setVariantQuantity and keys it compositely', () => {
    const { result } = renderSelection();
    act(() =>
      result.current.selection.setVariantQuantity(
        {
          pod_id: POD_ID,
          pod_title: 'My Pod',
          club_slug: 'club-x',
          product_id: 'p1',
          variant_id: 'v9',
          variant_label: 'Large',
          product_name: 'Widget',
          image_url: 'img1.png',
          unit_cost: 12,
          max_quantity: 4,
        },
        3,
      ),
    );

    expect(result.current.selection.selectedProducts).toEqual({ 'p1::v9': 3 });
    expect(result.current.selection.selectedProductTotal).toBe(36);
    expect(result.current.selection.selectedProductList).toEqual([
      { product_id: 'p1', variant_id: 'v9', quantity: 3, unit_cost: 12 },
    ]);
  });

  it('only counts lines belonging to this pod', () => {
    const { result } = renderSelection();
    // Write a line for a different pod directly through the cart.
    act(() =>
      result.current.cart.setLine(
        {
          pod_id: 'other-pod',
          pod_title: 'Other',
          club_slug: 'club-y',
          product_id: 'zz',
          variant_id: '',
          variant_label: '',
          product_name: 'Other',
          image_url: '',
          unit_cost: 99,
          max_quantity: 1,
        },
        1,
      ),
    );
    act(() => result.current.selection.setSelectedProducts({ p1: 1 }));

    expect(result.current.selection.selectedProducts).toEqual({ p1: 1 });
    expect(result.current.selection.selectedProductTotal).toBe(10);
  });

  it('handles a null/undefined pod without throwing', () => {
    const { result } = renderSelection(null);
    act(() => result.current.selection.setSelectedProducts({ p1: 1 }));
    // No product_requests -> nothing added.
    expect(result.current.selection.selectedProducts).toEqual({});
  });
});
