import '@testing-library/jest-dom/vitest';
import { renderHook, act } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CartProvider, useCart } from '../../../components/cart/CartContext';
import { PODS_FOR_PRODUCT } from '../../ProductDetailPage';
import { useQuickAddToCart } from '../useQuickAddToCart';
import type { ShopProduct } from '../queries';

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

const podsMock = (pods: ReturnType<typeof pod>[]): MockedResponse => ({
  request: { query: PODS_FOR_PRODUCT, variables: { id: 'p1' } },
  result: { data: { podsForProduct: pods } },
});

const product = { id: 'p1' } as ShopProduct;

const useCombined = () => ({ cart: useCart(), quick: useQuickAddToCart() });

function renderCombined(mocks: MockedResponse[]) {
  return renderHook(() => useCombined(), {
    wrapper: ({ children }: Readonly<{ children: React.ReactNode }>) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        <CartProvider>{children}</CartProvider>
      </MockedProvider>
    ),
  });
}

// What the buyer is told, read off the app's real notify channel.
let notices: { message: string; severity: string }[] = [];
const onNotify = (e: Event) => {
  const { message, severity } = (e as CustomEvent<{ message: string; severity: string }>).detail;
  notices.push({ message, severity });
};

beforeEach(() => {
  localStorage.clear();
  notices = [];
  globalThis.addEventListener('duncit:notify', onNotify);
});
afterEach(() => globalThis.removeEventListener('duncit:notify', onNotify));

describe('useQuickAddToCart', () => {
  it('adds the base product via the cheapest pod, then increments', async () => {
    const cheapest = [pod({ pod_id: 'dear', unit_cost: 200 }), pod({ pod_id: 'cheap', unit_cost: 80 })];
    const { result } = renderCombined([podsMock(cheapest), podsMock(cheapest)]);

    await act(async () => {
      await result.current.quick.add(product);
    });
    expect(result.current.cart.lines).toHaveLength(1);
    expect(result.current.cart.lines[0].pod_id).toBe('cheap');
    expect(result.current.cart.lines[0].quantity).toBe(1);
    expect(result.current.quick.addingId).toBeNull();

    await act(async () => {
      await result.current.quick.add(product);
    });
    expect(result.current.cart.lines).toHaveLength(1);
    expect(result.current.cart.lines[0].quantity).toBe(2);
  });

  it('adds nothing and tells the buyer when no live pod stocks the product', async () => {
    const { result } = renderCombined([podsMock([])]);
    await act(async () => {
      await result.current.quick.add(product);
    });
    expect(result.current.cart.lines).toHaveLength(0);
    expect(result.current.quick.addingId).toBeNull();
    expect(notices).toEqual([
      { message: 'No pod stocks this product right now.', severity: 'info' },
    ]);
  });

  it('stops at the pod stock instead of over-filling the line', async () => {
    const lowStock = [pod({ available_count: 1 })];
    const { result } = renderCombined([podsMock(lowStock), podsMock(lowStock)]);
    await act(async () => {
      await result.current.quick.add(product);
    });
    expect(result.current.cart.lines[0].quantity).toBe(1);
    expect(notices).toEqual([]);

    await act(async () => {
      await result.current.quick.add(product);
    });
    expect(result.current.cart.lines[0].quantity).toBe(1);
    expect(notices).toEqual([
      {
        message: 'You already have all the available stock of this product in your cart.',
        severity: 'info',
      },
    ]);
  });

  it('surfaces a failed lookup as an error notice and clears the spinner', async () => {
    const { result } = renderCombined([
      { request: { query: PODS_FOR_PRODUCT, variables: { id: 'p1' } }, error: new Error('offline') },
    ]);
    await act(async () => {
      await result.current.quick.add(product);
    });
    expect(result.current.cart.lines).toHaveLength(0);
    expect(result.current.quick.addingId).toBeNull();
    expect(notices).toEqual([
      { message: 'Could not add this to your cart. Please try again.', severity: 'error' },
    ]);
  });
});
