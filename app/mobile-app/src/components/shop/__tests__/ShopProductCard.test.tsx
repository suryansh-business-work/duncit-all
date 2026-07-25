import { fireEvent, screen } from '@testing-library/react-native';

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
    category_id: 'cat1',
    super_category_id: 'sup1',
    sub_category_id: null,
    created_at: null,
    review_summary: { average_rating: 0, total: 0 },
    ...over,
  }) as ShopProduct;

describe('ShopProductCard', () => {
  it('quick-adds via the corner button without opening the product', () => {
    const onOpen = jest.fn();
    const onQuickAdd = jest.fn();
    renderWithProviders(
      <ShopProductCard
        product={product()}
        adding={false}
        onOpen={onOpen}
        onQuickAdd={onQuickAdd}
      />,
    );
    fireEvent.press(screen.getByTestId('shop-product-add-p1'));
    expect(onQuickAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('shop-product-p1'));
    expect(onOpen).toHaveBeenCalledWith('p1');
  });

  it('shows the spinner in place of the cart icon while adding', () => {
    renderWithProviders(
      <ShopProductCard product={product()} adding onOpen={jest.fn()} onQuickAdd={jest.fn()} />,
    );
    expect(screen.getByTestId('shop-product-add-p1')).toBeOnTheScreen();
  });
});
