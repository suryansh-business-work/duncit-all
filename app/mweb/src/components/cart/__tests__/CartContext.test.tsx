import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CartProvider, cartLineKey, useCart, type CartLineMeta } from '../CartContext';

const STORAGE_KEY = 'mweb_cart_lines';

const meta = (over: Partial<CartLineMeta> = {}): CartLineMeta => ({
  pod_id: 'pod-1',
  pod_title: 'Pod One',
  club_slug: 'club-one',
  product_id: 'prod-1',
  variant_id: '',
  variant_label: 'Default',
  product_name: 'Widget',
  image_url: 'http://img/1.png',
  unit_cost: 100,
  max_quantity: 5,
  ...over,
});

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

const renderCart = () => renderHook(() => useCart(), { wrapper });

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('cartLineKey', () => {
  it('keys base and variant lines distinctly', () => {
    expect(cartLineKey({ product_id: 'p', variant_id: '' })).toBe('p');
    expect(cartLineKey({ product_id: 'p', variant_id: 'v' })).toBe('p::v');
  });
});

describe('useCart guard', () => {
  it('throws outside a provider', () => {
    expect(() => renderHook(() => useCart())).toThrow('useCart must be used inside CartProvider');
  });
});

describe('CartProvider', () => {
  it('starts empty and adds a line', () => {
    const { result } = renderCart();
    expect(result.current.lines).toEqual([]);
    expect(result.current.totalCount).toBe(0);

    act(() => result.current.setLine(meta(), 2));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].quantity).toBe(2);
    expect(result.current.totalCount).toBe(2);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(1);
  });

  it('updates quantity in place without reordering', () => {
    const { result } = renderCart();
    act(() => result.current.setLine(meta({ product_id: 'a' }), 1));
    act(() => result.current.setLine(meta({ product_id: 'b' }), 1));
    act(() => result.current.setLine(meta({ product_id: 'a' }), 4));

    expect(result.current.lines.map((l) => l.product_id)).toEqual(['a', 'b']);
    expect(result.current.lines[0].quantity).toBe(4);
    expect(result.current.totalCount).toBe(5);
  });

  it('treats base and variant of same product as distinct lines', () => {
    const { result } = renderCart();
    act(() => result.current.setLine(meta({ variant_id: '' }), 1));
    act(() => result.current.setLine(meta({ variant_id: 'v1' }), 3));
    expect(result.current.lines).toHaveLength(2);
    expect(result.current.totalCount).toBe(4);
  });

  it('removes a line when quantity <= 0', () => {
    const { result } = renderCart();
    act(() => result.current.setLine(meta(), 2));
    act(() => result.current.setLine(meta(), 0));
    expect(result.current.lines).toEqual([]);
  });

  it('is a no-op when removing a non-existent line via quantity <= 0', () => {
    const { result } = renderCart();
    act(() => result.current.setLine(meta({ product_id: 'x' }), 1));
    act(() => result.current.setLine(meta({ product_id: 'ghost' }), 0));
    expect(result.current.lines).toHaveLength(1);
  });

  it('removeLine removes only the matching pod+key line', () => {
    const { result } = renderCart();
    act(() => result.current.setLine(meta({ product_id: 'a' }), 1));
    act(() => result.current.setLine(meta({ product_id: 'b' }), 1));
    const key = cartLineKey({ product_id: 'a', variant_id: '' });
    act(() => result.current.removeLine('pod-1', key));
    expect(result.current.lines.map((l) => l.product_id)).toEqual(['b']);
  });

  it('clearPod drops every line for a pod', () => {
    const { result } = renderCart();
    act(() => result.current.setLine(meta({ pod_id: 'p1', product_id: 'a' }), 1));
    act(() => result.current.setLine(meta({ pod_id: 'p1', product_id: 'b' }), 1));
    act(() => result.current.setLine(meta({ pod_id: 'p2', product_id: 'c' }), 1));
    act(() => result.current.clearPod('p1'));
    expect(result.current.lines.map((l) => l.pod_id)).toEqual(['p2']);
  });
});

describe('loadLines hydration', () => {
  it('hydrates valid stored lines', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ ...meta(), quantity: 3 }]),
    );
    const { result } = renderCart();
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.totalCount).toBe(3);
  });

  it('filters out malformed stored entries', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ ...meta(), quantity: 1 }, { pod_id: 'x' }, null]),
    );
    const { result } = renderCart();
    expect(result.current.lines).toHaveLength(1);
  });

  it('returns empty on non-array stored payload', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'array' }));
    const { result } = renderCart();
    expect(result.current.lines).toEqual([]);
  });

  it('returns empty on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const { result } = renderCart();
    expect(result.current.lines).toEqual([]);
  });
});
