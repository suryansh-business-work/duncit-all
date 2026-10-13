import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import { CART_CONTROL_NOTICE_MS, type CartControlLabels } from '@duncit/utils';
import { CartControlNoticeChip, useCartControlNotice } from '../src/cart-control';

const LABELS: Pick<CartControlLabels, 'added' | 'removed'> = {
  added: 'Item added',
  removed: 'Item removed',
};

const watch = (quantity: number) =>
  renderHook(({ value }) => useCartControlNotice(value), { initialProps: { value: quantity } });

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useCartControlNotice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('raises nothing on mount, whether or not the product is already in the cart', () => {
    expect(watch(0).result.current).toBeNull();
    expect(watch(3).result.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('says "added" for the first unit and clears after the notice time', () => {
    const { result, rerender } = watch(0);
    rerender({ value: 1 });
    expect(result.current).toBe('added');
    advance(CART_CONTROL_NOTICE_MS - 1);
    expect(result.current).toBe('added');
    advance(1);
    expect(result.current).toBeNull();
  });

  it('says "removed" for the last unit and clears after the notice time', () => {
    const { result, rerender } = watch(1);
    rerender({ value: 0 });
    expect(result.current).toBe('removed');
    advance(CART_CONTROL_NOTICE_MS);
    expect(result.current).toBeNull();
  });

  it('raises nothing for a step that keeps the product in the cart', () => {
    const { result, rerender } = watch(2);
    rerender({ value: 3 });
    expect(result.current).toBeNull();
    rerender({ value: 2 });
    expect(result.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('lets "added" run its full time when a second unit follows straight away', () => {
    const { result, rerender } = watch(0);
    rerender({ value: 1 });
    advance(600);
    rerender({ value: 2 });
    expect(result.current).toBe('added');
    advance(CART_CONTROL_NOTICE_MS - 601);
    expect(result.current).toBe('added');
    advance(1);
    expect(result.current).toBeNull();
  });

  it('restarts the clock when a new notice replaces the one on screen', () => {
    const { result, rerender } = watch(0);
    rerender({ value: 1 });
    advance(1000);
    rerender({ value: 0 });
    expect(result.current).toBe('removed');
    // The first notice's clock would have run out here.
    advance(CART_CONTROL_NOTICE_MS - 1000);
    expect(result.current).toBe('removed');
    expect(vi.getTimerCount()).toBe(1);
    advance(1000);
    expect(result.current).toBeNull();
  });

  it('drops its timer when the card leaves the screen', () => {
    const { rerender, unmount } = watch(0);
    rerender({ value: 1 });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('CartControlNoticeChip', () => {
  it('is an empty, invisible live region between notices', () => {
    render(<CartControlNoticeChip notice={null} labels={LABELS} testId="chai-notice" />);
    const chip = screen.getByRole('status');
    expect(chip).toBe(screen.getByTestId('chai-notice'));
    expect(chip).toHaveTextContent('');
    expect(chip).toHaveStyle({ opacity: '0', pointerEvents: 'none' });
  });

  it('shows the added copy', () => {
    render(<CartControlNoticeChip notice="added" labels={LABELS} />);
    const chip = screen.getByRole('status');
    expect(chip).toHaveTextContent('Item added');
    expect(chip).toHaveStyle({ opacity: '1' });
    expect(chip).not.toHaveAttribute('data-testid');
  });

  it('shows the removed copy in the same live region it was mounted with', () => {
    const { rerender } = render(<CartControlNoticeChip notice={null} labels={LABELS} />);
    const chip = screen.getByRole('status');
    rerender(<CartControlNoticeChip notice="removed" labels={LABELS} />);
    expect(screen.getByRole('status')).toBe(chip);
    expect(chip).toHaveTextContent('Item removed');
  });

  it('sits top-centre of the card by default and lets the card move it', () => {
    const { rerender } = render(<CartControlNoticeChip notice="added" labels={LABELS} />);
    expect(screen.getByRole('status')).toHaveStyle({ position: 'absolute', left: '50%' });
    rerender(<CartControlNoticeChip notice="added" labels={LABELS} sx={{ left: 'auto', right: 0 }} />);
    expect(screen.getByRole('status')).toHaveStyle({ position: 'absolute', left: 'auto' });
  });
});
