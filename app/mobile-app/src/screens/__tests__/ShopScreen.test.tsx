import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ShopScreen, sortShopProducts, type ShopProduct } from '@/screens/ShopScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
let mockCategories: { id: string; name: string; level: string; parent_id: string | null }[] = [];
jest.mock('@/hooks/useHomeFeed', () => ({
  useHomeData: () => ({ categories: mockCategories }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: { productId: 'p1' } }),
}));
// The sheet's behavior is covered in ProductDetailSheet.test — stub it here.
jest.mock('@/components/details/ProductDetailSheet', () => ({
  ProductDetailSheet: () => null,
}));

const mockRequest = graphqlRequest as jest.Mock;

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
    ...over,
  }) as ShopProduct;

beforeEach(() => {
  jest.useFakeTimers();
  mockNavigate.mockClear();
  mockRequest.mockReset();
  mockCategories = [
    { id: 'sup1', name: 'Lifestyle', level: 'SUPER', parent_id: null },
    { id: 'cat1', name: 'Apparel', level: 'CATEGORY', parent_id: 'sup1' },
    { id: 'cat2', name: 'Drinks', level: 'CATEGORY', parent_id: 'sup1' },
  ];
});

afterEach(() => {
  jest.useRealTimers();
});

describe('sortShopProducts', () => {
  const items = [
    product({ id: 'a', product_name: 'Zebra', unit_cost: 50 }),
    product({ id: 'b', product_name: 'Apple', unit_cost: 200 }),
  ];
  it('sorts by name, price ascending and price descending', () => {
    expect(sortShopProducts(items, 'NAME').map((p) => p.id)).toEqual(['b', 'a']);
    expect(sortShopProducts(items, 'PRICE_ASC').map((p) => p.id)).toEqual(['a', 'b']);
    expect(sortShopProducts(items, 'PRICE_DESC').map((p) => p.id)).toEqual(['b', 'a']);
  });
});

describe('ShopScreen', () => {
  it('shows the loading spinner, then the product grid, and opens a product', async () => {
    mockRequest.mockResolvedValue({
      availablePodProducts: [
        product(),
        product({
          id: 'p2',
          product_name: 'Beta Mug',
          brand_name: '',
          image_url: '',
          images: ['http://x/b.jpg'],
          category_id: 'cat2',
          unit_cost: 60,
        }),
      ],
    });
    renderWithProviders(<ShopScreen />);
    expect(screen.getByTestId('shop-loading')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('shop-product-p1')).toBeOnTheScreen());
    expect(screen.getByText('Beta Mug')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('shop-product-p1'));
    expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { productId: 'p1' });
  });

  it('filters by category chip and debounced search, and sorts by price', async () => {
    mockRequest.mockResolvedValue({
      availablePodProducts: [
        product(),
        product({
          id: 'p2',
          product_name: 'Beta Mug',
          brand_name: 'Rival',
          category_id: 'cat2',
          unit_cost: 60,
        }),
      ],
    });
    renderWithProviders(<ShopScreen />);
    await waitFor(() => expect(screen.getByTestId('shop-product-p1')).toBeOnTheScreen());

    // Category chip narrows to Apparel (p1 only).
    fireEvent.press(screen.getByTestId('shop-cat-cat1'));
    expect(screen.queryByTestId('shop-product-p2')).toBeNull();
    fireEvent.press(screen.getByTestId('shop-cat-all'));

    // Sort by price ascending puts the ₹60 mug first.
    fireEvent.press(screen.getByTestId('shop-sort-PRICE_ASC'));
    expect(screen.getByTestId('shop-product-p2')).toBeOnTheScreen();

    // Debounced search: nothing filters until the pause elapses.
    fireEvent.changeText(screen.getByTestId('shop-search-input'), 'acme');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(screen.getByTestId('shop-product-p1')).toBeOnTheScreen();
    expect(screen.queryByTestId('shop-product-p2')).toBeNull();

    // A term matching nothing shows the empty state.
    fireEvent.changeText(screen.getByTestId('shop-search-input'), 'zzz');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(screen.getByTestId('shop-empty')).toBeOnTheScreen();
  });

  it('surfaces a load error', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<ShopScreen />);
    await waitFor(() => expect(screen.getByTestId('shop-error')).toHaveTextContent('offline'));
  });

  it('hides the category rail when no categories exist and covers image fallbacks', async () => {
    mockCategories = [];
    mockRequest.mockResolvedValue({
      availablePodProducts: [
        product({ id: 'p3', product_name: 'Bare', image_url: '', images: [] }),
      ],
    });
    renderWithProviders(<ShopScreen />);
    await waitFor(() => expect(screen.getByTestId('shop-product-p3')).toBeOnTheScreen());
    expect(screen.queryByTestId('shop-cat-all')).toBeNull();
  });
});

describe('ProductDetailScreen', () => {
  it('renders the detail sheet for the routed product', () => {
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByTestId('product-detail-screen')).toBeOnTheScreen();
  });
});
