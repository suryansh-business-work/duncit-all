import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { useCartStore, type CartLine } from '@/stores/cart.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { productId: 'p1' } }),
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));
// Controllable stub exposing the add/remove + selection wiring the screen builds.
jest.mock('@/components/details/ProductDetailSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    ProductDetailSheet: ({ onUpdateLine, maxQuantity, selection, readOnly }: any) => (
      <>
        <Text testID="pds-max">{String(maxQuantity)}</Text>
        <Text testID="pds-selected">{String(selection?.p1 ?? 0)}</Text>
        {readOnly || !onUpdateLine ? (
          <Text testID="pds-readonly">readonly</Text>
        ) : (
          <>
            <Pressable testID="pds-add" onPress={() => onUpdateLine(2, null)}>
              <Text>add</Text>
            </Pressable>
            <Pressable
              testID="pds-add-variant"
              onPress={() =>
                onUpdateLine(1, {
                  id: 'v1',
                  label: 'Blue',
                  unit_cost: 150,
                  image_url: 'https://cdn/v.jpg',
                  max: 4,
                })
              }
            >
              <Text>add-variant</Text>
            </Pressable>
          </>
        )}
      </>
    ),
  };
});

const mockRequest = graphqlRequest as jest.Mock;

const pod = (over: Record<string, unknown> = {}) => ({
  pod_id: 'podB',
  pod_title: 'Beach Bash',
  club_slug: 'cb',
  product_name: 'Tee',
  unit_cost: 100,
  available_count: 8,
  free_delivery_above: 500,
  image_url: 'https://cdn/b.jpg',
  ...over,
});

const otherLine: CartLine = {
  pod_id: 'podB',
  pod_title: 'Beach Bash',
  club_slug: 'cb',
  product_id: 'other',
  variant_id: '',
  variant_label: '',
  product_name: 'X',
  image_url: '',
  unit_cost: 10,
  quantity: 1,
  max_quantity: 5,
};

beforeEach(() => {
  mockRequest.mockReset();
  useCartStore.setState({ lines: [], hydrated: true });
});

describe('ProductDetailScreen', () => {
  it('resolves the cheapest stocking pod and adds the product to the shared cart', async () => {
    // A pre-existing unrelated line is skipped when building the selection map.
    useCartStore.setState({ lines: [otherLine], hydrated: true });
    mockRequest.mockResolvedValue({
      podsForProduct: [
        pod({ pod_id: 'podA', unit_cost: 120, available_count: 5, free_delivery_above: null }),
        pod(), // cheapest (₹100)
      ],
    });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('pds-add')).toBeOnTheScreen());
    // Cheapest pod (podB, ₹100, stock 8) auto-picked bounds the quantity bar.
    expect(screen.getByTestId('pds-max')).toHaveTextContent('8');

    fireEvent.press(screen.getByTestId('pds-add'));
    const line = useCartStore.getState().lines.find((l) => l.product_id === 'p1')!;
    expect(line).toMatchObject({
      pod_id: 'podB',
      product_id: 'p1',
      product_name: 'Tee',
      unit_cost: 100,
      quantity: 2,
      max_quantity: 8,
      free_delivery_above: 500,
    });
    // The selection map reflects the cart quantity for the picked pod.
    await waitFor(() => expect(screen.getByTestId('pds-selected')).toHaveTextContent('2'));
  });

  it('stays browse-only when no live pod stocks the product', async () => {
    mockRequest.mockResolvedValue({ podsForProduct: [] });
    renderWithProviders(<ProductDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('pds-readonly')).toBeOnTheScreen());
    expect(screen.getByTestId('pds-max')).toHaveTextContent('0');
  });

  it('stays browse-only when the pod lookup fails', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<ProductDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('pds-readonly')).toBeOnTheScreen());
  });

  it('adds a specific variant line with its own price/stock/image', async () => {
    // A pod with no free-delivery offer covers the `?? null` fallback.
    mockRequest.mockResolvedValue({ podsForProduct: [pod({ free_delivery_above: null })] });
    renderWithProviders(<ProductDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('pds-add-variant')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pds-add-variant'));
    const line = useCartStore.getState().lines.find((l) => l.variant_id === 'v1')!;
    expect(line).toMatchObject({
      variant_id: 'v1',
      variant_label: 'Blue',
      unit_cost: 150,
      image_url: 'https://cdn/v.jpg',
      max_quantity: 4,
      quantity: 1,
    });
  });

  it('ignores a late pods response after the screen unmounts', async () => {
    let resolve: (value: unknown) => void = () => {};
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderWithProviders(<ProductDetailScreen />);
    unmount();
    await act(async () => {
      resolve({ podsForProduct: [pod()] });
    });
    expect(mockRequest).toHaveBeenCalled();
  });
});
