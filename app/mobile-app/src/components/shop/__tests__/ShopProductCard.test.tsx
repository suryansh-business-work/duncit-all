import { act, fireEvent, screen } from '@testing-library/react-native';
import { CART_CONTROL_NOTICE_MS } from '@duncit/utils';

import { ShopProductCard } from '@/components/shop/ShopProductCard';
import type { ShopProduct } from '@/screens/ShopScreen';
import { renderWithProviders } from '@/utils/test-utils';

const product = (over: Partial<ShopProduct> = {}): ShopProduct =>
  ({
    id: 'p1',
    product_name: 'Alpha Tee',
    brand_name: 'Acme',
    image_url: 'http://x/a.jpg',
    images: [],
    unit_cost: 100,
    pod_available_count: 5,
    category_id: 'cat1',
    super_category_id: 'sup1',
    sub_category_id: null,
    created_at: null,
    review_summary: { average_rating: 0, total: 0 },
    ...over,
  }) as ShopProduct;

type CardProps = Parameters<typeof ShopProductCard>[0];

const card = (over: Partial<CardProps> = {}) => (
  <ShopProductCard
    product={product()}
    quantity={0}
    max={5}
    adding={false}
    cartReady
    onOpen={jest.fn()}
    onQuantity={jest.fn()}
    {...over}
  />
);

describe('ShopProductCard', () => {
  it('quick-adds via the corner button without opening the product', () => {
    const onOpen = jest.fn();
    const onQuantity = jest.fn();
    renderWithProviders(card({ onOpen, onQuantity }));

    fireEvent.press(screen.getByTestId('shop-product-add-p1'));
    expect(onQuantity).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), 1);
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('shop-product-p1'));
    expect(onOpen).toHaveBeenCalledWith('p1');
  });

  it('shows the cart quantity as a pill that steps and removes the line', () => {
    const onOpen = jest.fn();
    const onQuantity = jest.fn();
    const { rerender } = renderWithProviders(card({ quantity: 2, max: 3, onOpen, onQuantity }));

    expect(screen.queryByTestId('shop-product-add-p1')).toBeNull();
    expect(screen.getByTestId('shop-product-cart-p1-count')).toHaveTextContent('2');
    fireEvent.press(screen.getByTestId('shop-product-cart-p1-increase'));
    expect(onQuantity).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'p1' }), 3);
    fireEvent.press(screen.getByTestId('shop-product-cart-p1-decrease'));
    expect(onQuantity).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'p1' }), 1);

    // The last unit comes out through the same button.
    rerender(card({ quantity: 1, max: 3, onOpen, onQuantity }));
    fireEvent.press(screen.getByTestId('shop-product-cart-p1-decrease'));
    expect(onQuantity).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'p1' }), 0);

    // At the line's stock the plus is off.
    rerender(card({ quantity: 3, max: 3, onOpen, onQuantity }));
    onQuantity.mockClear();
    fireEvent.press(screen.getByTestId('shop-product-cart-p1-increase'));
    expect(onQuantity).not.toHaveBeenCalled();
    // None of it opened the product.
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('shows a spinner in the add button and ignores taps while the add resolves', () => {
    const onQuantity = jest.fn();
    renderWithProviders(card({ adding: true, onQuantity }));
    expect(screen.getByTestId('shop-product-add-p1-busy')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('shop-product-add-p1'));
    expect(onQuantity).not.toHaveBeenCalled();
  });

  it('says "Item added" over the image when the product lands in the cart, then clears', () => {
    jest.useFakeTimers();
    try {
      const { rerender } = renderWithProviders(card());
      expect(screen.queryByTestId('shop-product-notice-p1')).toBeNull();

      rerender(card({ quantity: 1 }));
      expect(screen.getByTestId('shop-product-notice-p1')).toHaveTextContent('Item added');
      act(() => {
        jest.advanceTimersByTime(CART_CONTROL_NOTICE_MS);
      });
      expect(screen.queryByTestId('shop-product-notice-p1')).toBeNull();

      rerender(card({ quantity: 0 }));
      expect(screen.getByTestId('shop-product-notice-p1')).toHaveTextContent('Item removed');
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not announce the saved cart being restored as an add', () => {
    const { rerender } = renderWithProviders(card({ cartReady: false }));
    rerender(card({ quantity: 2, cartReady: true }));
    expect(screen.getByTestId('shop-product-cart-p1-count')).toHaveTextContent('2');
    expect(screen.queryByTestId('shop-product-notice-p1')).toBeNull();
  });

  it('shows "Out of stock" and no add button when unavailable', () => {
    renderWithProviders(card({ product: product({ pod_available_count: 0 }), max: 0 }));
    expect(screen.getByTestId('shop-product-oos-p1')).toHaveTextContent('Out of stock');
    expect(screen.queryByTestId('shop-product-add-p1')).toBeNull();
  });

  it('keeps the pill on a sold-out product still in the cart, so it can be removed', () => {
    const onQuantity = jest.fn();
    renderWithProviders(
      card({ product: product({ pod_available_count: 0 }), quantity: 1, max: 1, onQuantity }),
    );
    fireEvent.press(screen.getByTestId('shop-product-cart-p1-decrease'));
    expect(onQuantity).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), 0);
  });
});
