import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import CartReminderNudge from '../CartReminderNudge';
import type { CartLine } from '../../CartContext';

const line = (id: string, over: Partial<CartLine> = {}): CartLine => ({
  pod_id: 'pod-1',
  pod_title: 'Sunset Jam',
  club_slug: 'club-one',
  product_id: id,
  variant_id: '',
  variant_label: '',
  product_name: `Product ${id}`,
  image_url: `https://img.example/${id}.jpg`,
  unit_cost: 100,
  quantity: 1,
  max_quantity: 5,
  ...over,
});

function renderNudge(props: Partial<Parameters<typeof CartReminderNudge>[0]> = {}) {
  const handlers = {
    onCheckout: vi.fn(),
    onHide: vi.fn(),
    onLater: vi.fn(),
    onMute: vi.fn(),
  };
  const utils = render(
    <CartReminderNudge open lines={[line('a')]} totalCount={1} hideMs={8000} {...handlers} {...props} />,
  );
  return { ...handlers, ...utils };
}

const thumbs = () =>
  Array.from(screen.getByTestId('cart-nudge').querySelectorAll('img')).map((img) => img.getAttribute('src'));

describe('CartReminderNudge', () => {
  it('renders nothing while closed', () => {
    renderNudge({ open: false });
    expect(screen.queryByTestId('cart-nudge')).not.toBeInTheDocument();
  });

  it('is a labelled region with the single-item copy', () => {
    renderNudge();
    const region = screen.getByRole('region', { name: 'Your cart is calling' });
    expect(region).toHaveTextContent('1 item is waiting for you. Check out before it sells out.');
  });

  it('counts several items in the body copy', () => {
    renderNudge({ lines: [line('a'), line('b')], totalCount: 4 });
    expect(screen.getByRole('status')).toHaveTextContent(
      '4 items are waiting for you. Check out before they sell out.',
    );
  });

  it('stacks at most three product thumbnails, skipping lines without an image', () => {
    renderNudge({
      lines: [line('a'), line('b', { image_url: '' }), line('c'), line('d'), line('e')],
      totalCount: 5,
    });
    expect(thumbs()).toEqual([
      'https://img.example/a.jpg',
      'https://img.example/c.jpg',
      'https://img.example/d.jpg',
    ]);
  });

  it('falls back to a cart icon when no line has an image', () => {
    renderNudge({ lines: [line('a', { image_url: '' })] });
    expect(thumbs()).toEqual([]);
    expect(screen.getByTestId('ShoppingCartOutlinedIcon')).toBeInTheDocument();
  });

  it('routes each action to its own handler', () => {
    const { onCheckout, onLater, onMute, onHide } = renderNudge();

    fireEvent.click(screen.getByTestId('cart-nudge-checkout'));
    expect(onCheckout).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Remind me next time' }));
    expect(onLater).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: "Don't remind me again" }));
    expect(onMute).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss cart reminder' }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('hides itself when the countdown bar finishes draining', () => {
    const { onHide } = renderNudge();
    const bar = screen.getByTestId('cart-nudge').querySelector('.cart-nudge-timer');
    if (!bar) throw new Error('the countdown bar did not render');
    expect(onHide).not.toHaveBeenCalled();
    fireEvent.animationEnd(bar);
    expect(onHide).toHaveBeenCalledTimes(1);
  });
});
