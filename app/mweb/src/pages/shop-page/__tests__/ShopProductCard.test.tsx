import '@testing-library/jest-dom/vitest';
import type { ComponentProps } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ShopProductCard from '../ShopProductCard';
import type { ShopProduct } from '../queries';

const baseProduct = (over: Partial<ShopProduct> = {}): ShopProduct => ({
  id: 'p-1',
  product_name: 'Wireless Headphones',
  brand_name: 'Acme',
  image_url: 'https://img.test/head.jpg',
  images: [],
  unit_cost: 4999,
  pod_available_count: 5,
  category_id: 'c-1',
  super_category_id: null,
  sub_category_id: null,
  created_at: null,
  ...over,
});

const price = (amount: number) => `Rs ${amount}`;

type CardProps = ComponentProps<typeof ShopProductCard>;
type Overrides = Partial<Omit<CardProps, 'product'>> & { product?: Partial<ShopProduct> };

function card({ product, ...rest }: Overrides = {}) {
  return (
    <ShopProductCard
      product={baseProduct(product)}
      priceFormat={price}
      quantity={0}
      max={5}
      busy={false}
      onOpen={vi.fn()}
      onQuantity={vi.fn()}
      {...rest}
    />
  );
}

const renderCard = (props: Overrides = {}) => render(card(props));

afterEach(() => vi.useRealTimers());

describe('ShopProductCard', () => {
  it('renders name, brand and formatted price', () => {
    renderCard();
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Rs 4999')).toBeInTheDocument();
  });

  it('renders the product image from image_url', () => {
    renderCard();
    const img = screen.getByAltText('Wireless Headphones') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://img.test/head.jpg');
  });

  it('falls back to images[0] when image_url is absent', () => {
    renderCard({ product: { image_url: null, images: ['https://img.test/alt.jpg'] } });
    const img = screen.getByAltText('Wireless Headphones') as HTMLImageElement;
    expect(img).toHaveAttribute('src', 'https://img.test/alt.jpg');
  });

  it('renders no image when neither image_url nor images are present', () => {
    const { container } = renderCard({ product: { image_url: null, images: [] } });
    expect(container.querySelector('img')).toBeNull();
  });

  it('omits the brand line when brand_name is absent', () => {
    renderCard({ product: { brand_name: null } });
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
  });

  it('fires onOpen with the product id when the card is clicked', () => {
    const onOpen = vi.fn();
    renderCard({ onOpen });
    fireEvent.click(screen.getByLabelText('View Wireless Headphones'));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith('p-1');
  });

  it('shows a lone "+" for a product that is not in the cart, and adds one without opening it', () => {
    const onOpen = vi.fn();
    const onQuantity = vi.fn();
    renderCard({ onOpen, onQuantity });
    expect(screen.queryByTestId('shop-product-p-1-qty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shop-product-p-1-dec')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Wireless Headphones' }));
    expect(onQuantity).toHaveBeenCalledOnce();
    expect(onQuantity.mock.calls[0][0].id).toBe('p-1');
    expect(onQuantity.mock.calls[0][1]).toBe(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('shows the cart quantity with a bin at one, which takes the product out', () => {
    const onOpen = vi.fn();
    const onQuantity = vi.fn();
    renderCard({ quantity: 1, onOpen, onQuantity });
    expect(screen.getByTestId('shop-product-p-1-qty')).toHaveTextContent('1');
    expect(screen.queryByRole('button', { name: 'Remove one Wireless Headphones' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Wireless Headphones' }));
    expect(onQuantity.mock.calls[0][1]).toBe(0);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('steps down with a minus from two up, and up with the plus', () => {
    const onQuantity = vi.fn();
    renderCard({ quantity: 3, onQuantity });
    expect(screen.getByTestId('shop-product-p-1-qty')).toHaveTextContent('3');

    fireEvent.click(screen.getByRole('button', { name: 'Remove one Wireless Headphones' }));
    expect(onQuantity.mock.calls[0][1]).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Add one more Wireless Headphones' }));
    expect(onQuantity.mock.calls[1][1]).toBe(4);
  });

  it('switches the plus off at the stock', () => {
    const onQuantity = vi.fn();
    renderCard({ quantity: 5, max: 5, onQuantity });
    const plus = screen.getByTestId('shop-product-p-1-inc');
    expect(plus).toBeDisabled();
    fireEvent.click(plus);
    expect(onQuantity).not.toHaveBeenCalled();
  });

  it('ignores taps while the pod lookup is in flight, without dropping focus', () => {
    const onQuantity = vi.fn();
    renderCard({ busy: true, onQuantity });
    const plus = screen.getByTestId('shop-product-p-1-add');
    expect(plus).toHaveAttribute('aria-disabled', 'true');
    expect(plus).not.toBeDisabled();
    fireEvent.click(plus);
    expect(onQuantity).not.toHaveBeenCalled();
  });

  it('shows "Out of stock" and no add button when unavailable', () => {
    renderCard({ product: { pod_available_count: 0 }, max: 0 });
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Wireless Headphones' })).not.toBeInTheDocument();
  });

  it('still lets a sold-out product that is in the cart be taken out', () => {
    const onQuantity = vi.fn();
    renderCard({ product: { pod_available_count: 0 }, quantity: 1, max: 1, onQuantity });
    expect(screen.getByTestId('shop-product-p-1-inc')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Wireless Headphones' }));
    expect(onQuantity.mock.calls[0][1]).toBe(0);
  });

  it('says nothing for a product that was already in the cart when the card appeared', () => {
    renderCard({ quantity: 2 });
    expect(screen.getByTestId('shop-product-p-1-notice')).toHaveTextContent('');
  });

  it('says "Item added" for the first unit and "Item removed" for the last, each for a moment', () => {
    vi.useFakeTimers();
    const { rerender } = renderCard({ quantity: 0 });
    const notice = screen.getByTestId('shop-product-p-1-notice');
    expect(notice).toHaveTextContent('');

    rerender(card({ quantity: 1 }));
    expect(notice).toHaveTextContent('Item added');
    // A second unit is not news, and does not cut the notice short.
    rerender(card({ quantity: 2 }));
    expect(notice).toHaveTextContent('Item added');
    act(() => vi.advanceTimersByTime(1600));
    expect(notice).toHaveTextContent('');

    rerender(card({ quantity: 0 }));
    expect(notice).toHaveTextContent('Item removed');
    act(() => vi.advanceTimersByTime(1600));
    expect(notice).toHaveTextContent('');
  });
});
