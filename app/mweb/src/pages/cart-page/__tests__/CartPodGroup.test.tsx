import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import CartPodGroup from '../CartPodGroup';
import type { CartLine } from '../../../components/cart/CartContext';

const line = (over: Partial<CartLine> = {}): CartLine => ({
  pod_id: 'p1',
  pod_title: 'Sunset Jam',
  club_slug: 'club-one',
  product_id: 'a',
  variant_id: '',
  variant_label: '',
  product_name: 'Alpha Tee',
  image_url: 'https://img.example/a.jpg',
  unit_cost: 100,
  quantity: 2,
  max_quantity: 3,
  ...over,
});

const priceFormat = (amount: number) => `Rs ${amount}`;

function renderGroup(lines: CartLine[]) {
  const handlers = { onSetQuantity: vi.fn(), onRemove: vi.fn(), onMoveToWishlist: vi.fn() };
  render(
    <CartPodGroup podId="p1" podTitle="Sunset Jam" lines={lines} priceFormat={priceFormat} {...handlers} />,
  );
  return handlers;
}

describe('CartPodGroup', () => {
  it('titles the card with the pod and totals every line', () => {
    renderGroup([line(), line({ product_id: 'b', product_name: 'Beta Cap', unit_cost: 50, quantity: 3 })]);

    const card = screen.getByTestId('cart-pod-p1');
    expect(within(card).getByText('Sunset Jam')).toBeInTheDocument();
    expect(within(card).getByText('Products total')).toBeInTheDocument();
    // 100×2 + 50×3
    expect(within(card).getByText('Rs 350')).toBeInTheDocument();
    expect(within(card).getByText('Rs 100 each')).toBeInTheDocument();
    expect(within(card).getByText('Rs 50 each')).toBeInTheDocument();
  });

  it('shows the product image, name, variant and quantity', () => {
    renderGroup([line({ variant_label: 'Size M' })]);
    expect(screen.getByRole('img', { name: 'Alpha Tee' })).toHaveAttribute('src', 'https://img.example/a.jpg');
    expect(screen.getByText('Alpha Tee — Size M')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('leaves the thumbnail empty and the name bare when there is no image or variant', () => {
    renderGroup([line({ image_url: '' })]);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha Tee')).toBeInTheDocument();
  });

  it('marks a line whose subtotal reaches the free-delivery threshold', () => {
    renderGroup([
      line({ free_delivery_above: 200 }),
      line({ product_id: 'b', product_name: 'Beta Cap', quantity: 1, free_delivery_above: 200 }),
      line({ product_id: 'c', product_name: 'Gamma Mug', free_delivery_above: null }),
    ]);
    // Only Alpha (100×2 = 200) qualifies.
    expect(screen.getAllByTestId('free-delivery-chip')).toHaveLength(1);
  });

  it('steps the quantity down and up for the named line', () => {
    const target = line({ quantity: 1 });
    const { onSetQuantity } = renderGroup([target]);

    fireEvent.click(screen.getByRole('button', { name: 'Decrease Alpha Tee' }));
    expect(onSetQuantity).toHaveBeenLastCalledWith(target, 0);

    fireEvent.click(screen.getByRole('button', { name: 'Increase Alpha Tee' }));
    expect(onSetQuantity).toHaveBeenLastCalledWith(target, 2);
  });

  it('stops increasing at the line’s maximum quantity', () => {
    const { onSetQuantity } = renderGroup([line({ quantity: 3, max_quantity: 3 })]);
    const increase = screen.getByRole('button', { name: 'Increase Alpha Tee' });
    expect(increase).toBeDisabled();
    fireEvent.click(increase);
    expect(onSetQuantity).not.toHaveBeenCalled();
  });

  it('removes a line and moves a line to the wishlist', () => {
    const alpha = line();
    const beta = line({ product_id: 'b', product_name: 'Beta Cap' });
    const { onRemove, onMoveToWishlist } = renderGroup([alpha, beta]);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Beta Cap' }));
    expect(onRemove).toHaveBeenCalledWith(beta);

    fireEvent.click(screen.getByRole('button', { name: 'Move to wishlist: Alpha Tee' }));
    expect(onMoveToWishlist).toHaveBeenCalledWith(alpha);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('totals an empty group as zero', () => {
    renderGroup([]);
    expect(screen.getByText('Rs 0')).toBeInTheDocument();
  });
});
